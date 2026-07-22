#!/bin/sh

echo "=== Starting OdontoCix ===" >&2

# Wait for database (up to 90 seconds)
echo "Waiting for database..." >&2
for i in $(seq 1 30); do
    php artisan migrate:status > /dev/null 2>&1 && echo "Database connected!" >&2 && break
    if [ "$i" = "30" ]; then
        echo "ERROR: Could not connect to database" >&2
    fi
    echo "  Attempt $i/30..." >&2
    sleep 3
done

# Run migrations
echo "Running migrations..." >&2
php artisan migrate --force --no-interaction 2>&1

# Seed roles and permissions
echo "Seeding roles..." >&2
php artisan db:seed --class=RoleSeeder --force --no-interaction 2>&1 || true

# Clear permission cache before creating admin
echo "Clearing permission cache..." >&2
php artisan cache:clear 2>&1 || true

# Create/ensure admin user
echo "Creating admin user..." >&2
php artisan app:create-admin 2>&1

echo "Starting services..." >&2
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
