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

# Install PHP extensions (all that Laravel needs)
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

# Set working directory
WORKDIR /var/www

# Copy full application code first
COPY api/ /var/www/

RUN ls -la /var/www/public/

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts || \
    composer install --no-dev --optimize-autoloader --no-interaction --no-scripts --ignore-platform-reqs

# Copy nginx, supervisor, and php-fpm configs
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
RUN rm -f /usr/local/etc/php-fpm.d/*
COPY docker/php-fpm-www.conf /usr/local/etc/php-fpm.d/zz-docker.conf
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Create necessary directories and set permissions
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

# Generate autoload files and optimize
RUN composer dump-autoload --optimize --no-interaction || true

# Set proper ownership for the entire app
RUN chown -R www-data:www-data /var/www

# Verify public/index.php exists
RUN test -f /var/www/public/index.php || (echo "ERROR: public/index.php not found" && exit 1)

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Expose port
EXPOSE 80

# Start via the start script (runs migrations then starts supervisor)
CMD ["/usr/local/bin/start.sh"]
