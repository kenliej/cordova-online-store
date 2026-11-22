#!/bin/sh
# Online Mall API entrypoint.
# - web role: wait for PostgreSQL, run migrations, storage link, warm caches
# - queue/scheduler roles: assume migrations were run by the web role
set -eu

APP_ROLE="${APP_ROLE:-web}"

if [ -z "${APP_KEY:-}" ]; then
    echo "[entrypoint] FATAL: APP_KEY is not set. Generate one with:" >&2
    echo "  php -r \"echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;\"" >&2
    echo "or 'docker compose run --rm app php artisan key:generate --show'." >&2
    exit 1
fi

# The named storage volume is mounted empty on first use; rebuild the tree and
# make sure the runtime (www-data) owns everything it must write.
mkdir -p \
    storage/app/public \
    storage/app/private \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwX storage bootstrap/cache

wait_for_database() {
    i=0
    until php -r '
        $driver = getenv("DB_CONNECTION") ?: "pgsql";
        $host = getenv("DB_HOST") ?: "db";
        $port = getenv("DB_PORT") ?: ($driver === "pgsql" ? "5432" : "3306");
        $database = getenv("DB_DATABASE");
        $dsn = $driver === "pgsql"
            ? "pgsql:host={$host};port={$port};dbname={$database}"
            : "mysql:host={$host};port={$port};dbname={$database}";
        try {
            new PDO($dsn, getenv("DB_USERNAME"), getenv("DB_PASSWORD"), [
                PDO::ATTR_TIMEOUT => 3,
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ]);
            exit(0);
        } catch (Throwable $e) {
            exit(1);
        }
    ' >/dev/null 2>&1; do
        i=$((i + 1))
        if [ "$i" -ge 60 ]; then
            echo "[entrypoint] FATAL: database not reachable at ${DB_HOST:-db}:${DB_PORT:-5432}" >&2
            exit 1
        fi
        sleep 2
    done
}

if [ "$APP_ROLE" = "web" ]; then
    echo "[entrypoint] waiting for database..."
    wait_for_database

    echo "[entrypoint] running migrations..."
    su-exec www-data php artisan migrate --force --no-interaction

    echo "[entrypoint] linking public storage..."
    su-exec www-data php artisan storage:link --force || true

    if [ "${APP_ENV:-production}" = "production" ]; then
        echo "[entrypoint] discovering packages and warming caches..."
        su-exec www-data php artisan package:discover --ansi || true
        su-exec www-data php artisan optimize --no-interaction || true
    fi
else
    wait_for_database
    echo "[entrypoint] ${APP_ROLE} role ready"
fi

# php-fpm must stay in the foreground as root (it drops privileges to www-data
# for workers); every other command runs directly as www-data.
if [ "$1" = "php-fpm" ]; then
    exec "$@"
fi
exec su-exec www-data "$@"
