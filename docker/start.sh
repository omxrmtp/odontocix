#!/bin/sh
set -e

# Run migrations
echo "Running migrations..."
php artisan migrate --force --no-interaction

# Seed roles if needed
echo "Seeding roles..."
php artisan db:seed --class=RoleSeeder --force --no-interaction || true

# Clear and cache configs
echo "Caching config..."
php artisan config:cache --no-interaction || true

echo "Caching routes..."
php artisan route:cache --no-interaction || true

echo "Caching views..."
php artisan view:cache --no-interaction || true

echo "Starting services..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
