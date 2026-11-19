# syntax=docker/dockerfile:1.7

###############################################################################
# Stage 1 — Composer dependencies (no dev packages)
###############################################################################
FROM composer:2 AS vendor

WORKDIR /app

# Install dependencies before copying the whole app to maximise layer caching.
COPY backend/composer.json backend/composer.lock ./
RUN composer install \
        --no-dev \
        --no-interaction \
        --no-progress \
        --prefer-dist \
        --no-autoloader \
        --no-scripts

COPY backend/ ./

RUN composer dump-autoload --optimize --no-dev --no-scripts \
    && mkdir -p \
        storage/app/public \
        storage/app/private \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache

###############################################################################
# Stage 2 — Runtime (php-fpm, non-root workers)
###############################################################################
FROM php:8.2-fpm-alpine

RUN apk add --no-cache \
        su-exec \
        tzdata \
        libzip-dev \
        oniguruma-dev \
        libcurl \
        curl-dev \
        icu-libs \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS icu-dev \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        mbstring \
        bcmath \
        opcache \
        zip \
        curl \
    && apk del .build-deps \
    && rm -rf /var/cache/apk/* /tmp/*

# Production PHP hardening (see docker/php/php.ini)
COPY docker/php/php.ini /usr/local/etc/php/conf.d/zz-onlinemall.ini
COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

WORKDIR /var/www/html

COPY --from=vendor --chown=www-data:www-data /app /var/www/html

# Writable runtime directories (the entrypoint repairs ownership when a
# named storage volume is mounted over /var/www/html/storage).
RUN mkdir -p \
        storage/app/public \
        storage/app/private \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

ENV APP_ENV=production \
    APP_DEBUG=false \
    APP_ROLE=web \
    PHP_OPCACHE_VALIDATE_TIMESTAMPS=0

EXPOSE 9000

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD php -r "exit(@fsockopen('127.0.0.1', 9000) ? 0 : 1);"

ENTRYPOINT ["entrypoint"]
CMD ["php-fpm"]
