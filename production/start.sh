#!/bin/sh
# Render container entrypoint: migrate, cache, then run php-fpm + nginx.
set -eu

cd /var/www/html

if [ -z "${APP_KEY:-}" ]; then
    echo "FATAL: APP_KEY is not set. Add it in Render environment variables." >&2
    exit 1
fi

if [ -z "${DB_URL:-}" ] && [ -z "${DATABASE_URL:-}" ] && [ -z "${DB_HOST:-}" ]; then
    echo "FATAL: no database configured (set DATABASE_URL / DB_URL from Neon)." >&2
    exit 1
fi

export DB_CONNECTION="${DB_CONNECTION:-pgsql}"
PORT="${PORT:-10000}"

mkdir -p \
    storage/app/public \
    storage/app/private \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache

# Render disks (when attached) are mounted as root; make them writable.
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
chmod -R ug+rwX storage bootstrap/cache 2>/dev/null || true

# Keep nginx from failing if the template was edited on Windows.
sed -i 's/\r$//' /etc/nginx/nginx.conf.template

php artisan config:clear >/dev/null 2>&1 || true

# Migrations must use Neon's direct (unpooled) connection. The app also runs on
# the direct connection: Neon's transaction pooler left aborted transactions
# (SQLSTATE 25P02) during multi-statement Laravel transactions such as
# registration, so this single long-lived Render service avoids the pooler.
if [ "${RUN_MIGRATIONS:-true}" = "true" ] && [ "${APP_ENV:-production}" = "production" ]; then
    echo "[start] running database migrations (direct connection)"
    if [ -n "${DATABASE_URL_UNPOOLED:-}" ]; then
        DB_URL="${DATABASE_URL_UNPOOLED}" php artisan migrate --force --no-interaction
    else
        php artisan migrate --force --no-interaction
    fi
fi

if [ -n "${DATABASE_URL_UNPOOLED:-}" ]; then
    export DATABASE_URL="${DATABASE_URL_UNPOOLED}"
    export DB_URL="${DATABASE_URL_UNPOOLED}"
    echo "[start] using direct Neon connection for the app"
fi

php artisan storage:link --force >/dev/null 2>&1 || true

# Cache config/routes/views now that runtime env is available.
php artisan optimize --no-interaction || true

# Render the port into the nginx template.
sed "s/__PORT__/${PORT}/g" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "[start] starting php-fpm on 127.0.0.1:9000 and nginx on 0.0.0.0:${PORT}"
php-fpm -D
sleep 1

exec nginx -g 'daemon off;'
