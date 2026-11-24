# syntax=docker/dockerfile:1.7
###############################################################################
# Render production image: PHP 8.2-FPM + nginx in one container.
# Listens on $PORT (Render provides it, default 10000).
# Build context: repository root.  Dockerfile: production/Dockerfile
###############################################################################

# ---- Stage 1: Composer dependencies (no dev packages) -----------------------
FROM composer:2 AS vendor

WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install \
        --no-dev --no-scripts --no-autoloader --prefer-dist \
        --no-interaction --no-progress

COPY backend/ ./
RUN composer dump-autoload --optimize --no-dev --no-scripts

# ---- Stage 2: Runtime -------------------------------------------------------
FROM php:8.2-fpm-alpine

RUN apk add --no-cache \
        nginx \
        libpq \
        libzip-dev \
        icu-dev \
        oniguruma-dev \
        curl-dev \
        tzdata \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS postgresql-dev \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_pgsql \
        pgsql \
        mbstring \
        bcmath \
        opcache \
        zip \
        curl \
    && apk del .build-deps \
    && rm -rf /var/cache/apk/* /tmp/*

WORKDIR /var/www/html

COPY --from=vendor /app /var/www/html
COPY production/nginx.conf /etc/nginx/nginx.conf.template
COPY production/php.ini /usr/local/etc/php/conf.d/zz-render.ini
COPY production/start.sh /usr/local/bin/start

RUN mkdir -p \
        storage/app/public \
        storage/app/private \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache \
    && chmod +x /usr/local/bin/start \
    && sed -i 's/\r$//' /usr/local/bin/start /etc/nginx/nginx.conf.template

EXPOSE 10000

CMD ["/usr/local/bin/start"]
