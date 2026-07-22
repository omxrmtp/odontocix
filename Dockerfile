FROM php:8.4-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    postgresql-dev \
    libpng-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    curl \
    oniguruma-dev \
    libxml2-dev \
    gettext-dev \
    icu-dev \
    linux-headers \
    $PHPIZE_DEPS

# Install PHP extensions
RUN docker-php-ext-install \
    pdo_pgsql \
    pgsql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip \
    opcache \
    intl \
    xml \
    dom

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copy composer files first (for layer caching)
COPY api/composer.json api/composer.lock ./

# Install dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts --no-autoloader || \
    composer install --no-dev --optimize-autoloader --no-interaction --no-scripts --no-autoloader --ignore-platform-reqs

# Copy the rest of the application
COPY api/ .

# Generate autoloader
RUN composer dump-autoload --optimize --no-interaction

# Remove default php-fpm configs and use ours
RUN rm -f /usr/local/etc/php-fpm.d/*

# Copy infrastructure configs
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/php-fpm-www.conf /usr/local/etc/php-fpm.d/zz-docker.conf
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Create directories and set permissions
RUN mkdir -p storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/framework/testing \
    storage/logs \
    storage/app/public \
    storage/app/private \
    bootstrap/cache \
    && chown -R www-data:www-data /var/www \
    && chmod -R 775 storage bootstrap/cache

# Verify critical files exist
RUN test -f /var/www/public/index.php || (echo "ERROR: public/index.php missing" && exit 1) && \
    test -f /var/www/vendor/autoload.php || (echo "ERROR: vendor/autoload.php missing" && exit 1) && \
    echo "Build OK: all critical files present"

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

EXPOSE 80

CMD ["/usr/local/bin/start.sh"]
