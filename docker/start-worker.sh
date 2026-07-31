#!/bin/sh

# Simple startup for Render worker service (no nginx, no php-fpm)

echo "=== Starting OdontoCix Worker ===" >&2

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

# Run migrations (safe to run from multiple containers)
echo "Running migrations..." >&2
php artisan migrate --force --no-interaction 2>&1

echo "Starting worker services (queue + scheduler)..." >&2
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord-worker.conf
