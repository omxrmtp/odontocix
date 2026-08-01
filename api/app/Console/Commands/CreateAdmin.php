<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class CreateAdmin extends Command
{
    protected $signature = 'app:create-admin';

    protected $description = 'Create or reset the super admin and demo users';

    public function handle(): int
    {
        if (! Role::where('name', 'Super Admin')->exists()) {
            $this->error('Super Admin role not found. Run RoleSeeder first.');

            return 1;
        }

        $this->ensureRealAdmin();
        $this->ensureDemoUser();

        return 0;
    }

    private function ensureRealAdmin(): void
    {
        $email = $this->env('ADMIN_EMAIL', 'DEMO_ADMIN_EMAIL', 'admin@odontocix.com');
        $password = $this->env('ADMIN_PASSWORD', 'DEMO_ADMIN_PASSWORD', 'admin123456');

        $tenant = Tenant::firstOrCreate(
            ['email' => $this->env('ADMIN_TENANT_EMAIL', null, 'admin@odontocix.com')],
            [
                'name' => $this->env('ADMIN_TENANT_NAME', null, 'OdontoCix'),
                'ruc' => $this->env('ADMIN_TENANT_RUC', null, '20123456789'),
                'phone' => $this->env('ADMIN_TENANT_PHONE', null, '999111222'),
                'address' => $this->env('ADMIN_TENANT_ADDRESS', null, 'Av. Principal 123'),
                'estado' => 'active',
                'is_demo' => false,
            ]
        );

        if ($tenant->is_demo) {
            $tenant->update(['is_demo' => false]);
        }

        $this->upsertUser($email, $password, 'Super Admin', $tenant);

        $this->info("Admin tenant: {$tenant->name} ({$tenant->id})");
        $this->info("Admin email: {$email}");
    }

    private function ensureDemoUser(): void
    {
        $email = $this->env('DEMO_USER_EMAIL', null, 'demo@odontocix.com');
        $password = $this->env('DEMO_USER_PASSWORD', null, 'demo123456');

        $tenant = Tenant::firstOrCreate(
            ['email' => $this->env('DEMO_TENANT_EMAIL', null, 'demo@odontocix.com')],
            [
                'name' => $this->env('DEMO_TENANT_NAME', null, 'Clínica Demo'),
                'ruc' => $this->env('DEMO_TENANT_RUC', null, '12345678901'),
                'phone' => $this->env('DEMO_TENANT_PHONE', null, '999000000'),
                'address' => $this->env('DEMO_TENANT_ADDRESS', null, 'Av. Demostración 123'),
                'estado' => 'active',
                'is_demo' => true,
            ]
        );

        if (! $tenant->is_demo) {
            $tenant->update(['is_demo' => true]);
        }

        $this->upsertUser($email, $password, 'Usuario Demo', $tenant);

        $this->info("Demo tenant: {$tenant->name} ({$tenant->id})");
        $this->info("Demo email: {$email}");
    }

    private function upsertUser(string $email, string $password, string $name, Tenant $tenant): User
    {
        $user = User::where('email', $email)->first();

        if (! $user) {
            $user = new User;
            $user->name = $name;
            $user->email = $email;
            $user->password = $password;
            $user->tenant_id = $tenant->id;
            $user->save();
            $user->assignRole('Super Admin');
            $this->info("User CREATED (id={$user->id}): {$email}");
        } else {
            $user->name = $name;
            $user->password = $password;
            $user->tenant_id = $tenant->id;
            $user->save();
            if (! $user->hasRole('Super Admin')) {
                $user->assignRole('Super Admin');
            }
            $this->info("User UPDATED (id={$user->id}): {$email}");
        }

        $fresh = User::where('email', $email)->first();
        $this->info('Password verify: '.(Hash::check($password, $fresh->password) ? 'OK' : 'FAILED'));

        return $user;
    }

    private function env(string $key, ?string $fallbackKey, string $default): string
    {
        $value = env($key);

        if (! empty($value)) {
            return $value;
        }

        if ($fallbackKey !== null) {
            $value = env($fallbackKey);

            if (! empty($value)) {
                return $value;
            }
        }

        return $default;
    }
}
