#!/bin/sh

echo "=== Starting OdontoCix ==="

# Wait for database (up to 90 seconds)
echo "Waiting for database..."
for i in $(seq 1 30); do
    php artisan db:show > /dev/null 2>&1 && echo "Database connected!" && break
    if [ "$i" = "30" ]; then
        echo "WARNING: Could not connect to database after 90s"
    fi
    echo "  Attempt $i/30 - waiting..."
    sleep 3
done

# Run migrations
echo "Running migrations..."
php artisan migrate --force --no-interaction
if [ $? -ne 0 ]; then
    echo "ERROR: Migrations failed!"
fi

# Seed database
echo "Seeding database..."
php artisan db:seed --force --no-interaction
if [ $? -ne 0 ]; then
    echo "WARNING: Seed failed, creating admin user directly..."
    php artisan tinker --execute="
        \$t = App\Models\Tenant::firstOrCreate(['email' => env('DEMO_TENANT_EMAIL', 'demo@odontocix.com')], ['name' => 'Clinica Demo', 'ruc' => '12345678901', 'phone' => '999000000', 'address' => 'Av. Demostracion 123', 'estado' => 'active']);
        App\Models\User::updateOrCreate(['email' => env('DEMO_ADMIN_EMAIL', 'admin@odontocix.com')], ['name' => 'Super Admin', 'password' => env('DEMO_ADMIN_PASSWORD', 'admin123456'), 'tenant_id' => \$t->id]);
        echo 'Admin user created/updated';
    " 2>&1 || echo "WARNING: Direct user creation also failed"
fi

# Verify user exists
echo "Verifying admin user..."
php artisan tinker --execute="
    \$user = App\Models\User::where('email', env('DEMO_ADMIN_EMAIL', 'admin@odontocix.com'))->first();
    echo \$user ? 'Admin user found (id: ' . \$user->id . ')' : 'ERROR: Admin user NOT found';
" 2>&1

# Cache configs
echo "Caching config..."
php artisan config:cache --no-interaction || true
php artisan route:cache --no-interaction || true
php artisan view:cache --no-interaction || true

echo "Starting services..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
