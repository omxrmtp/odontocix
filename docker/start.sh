#!/bin/sh

echo "=== Starting OdontoCix ==="

# Wait for database (up to 90 seconds)
echo "Waiting for database..."
for i in $(seq 1 30); do
    php artisan db:show > /dev/null 2>&1 && echo "Database connected!" && break
    echo "  Attempt $i/30 - waiting..."
    sleep 3
done

# Run migrations
echo "Running migrations..."
php artisan migrate --force --no-interaction || echo "WARNING: migrations failed, check DB config"

# Seed all data (roles, admin user, treatments, etc.)
echo "Seeding database..."
php artisan db:seed --force --no-interaction || true

# Cache configs
echo "Caching config..."
php artisan config:cache --no-interaction || true
php artisan route:cache --no-interaction || true
php artisan view:cache --no-interaction || true

echo "Starting services..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
