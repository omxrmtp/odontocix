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

# Create/ensure admin user directly
echo "Creating admin user..." >&2
php artisan tinker --execute="
\$email = env('DEMO_ADMIN_EMAIL', 'admin@odontocix.com');
\$password = env('DEMO_ADMIN_PASSWORD', 'admin123456');
\$tenant = App\Models\Tenant::firstOrCreate(
    ['email' => env('DEMO_TENANT_EMAIL', 'demo@odontocix.com')],
    ['name' => 'Clinica Demo', 'ruc' => '12345678901', 'phone' => '999000000', 'address' => 'Av. Demostracion 123', 'estado' => 'active']
);
\$user = App\Models\User::where('email', \$email)->first();
if (!\$user) {
    \$user = App\Models\User::create(['name' => 'Super Admin', 'email' => \$email, 'password' => \$password, 'tenant_id' => \$tenant->id]);
    \$user->assignRole('Super Admin');
    echo 'Admin user CREATED';
} else {
    \$user->update(['password' => \$password]);
    echo 'Admin user UPDATED password';
}
echo ' -> email: ' . \$email;
" 2>&1

# Verify
echo "Verifying..." >&2
php artisan tinker --execute="
\$u = App\Models\User::where('email', env('DEMO_ADMIN_EMAIL', 'admin@odontocix.com'))->first();
if (\$u) { echo 'User exists: id=' . \$u->id . ' tenant_id=' . \$u->tenant_id; } else { echo 'ERROR: User NOT found!'; }
" 2>&1

echo "Starting services..." >&2
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
