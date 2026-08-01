<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $this->ensureRealAdmin();
        $this->ensureDemoUser();
    }

    /**
     * Crea/actualiza el tenant real y su usuario administrador.
     */
    private function ensureRealAdmin(): void
    {
        $tenant = Tenant::firstOrCreate(
            ['email' => $this->env('ADMIN_TENANT_EMAIL', 'admin@odontocix.com')],
            [
                'name' => $this->env('ADMIN_TENANT_NAME', 'OdontoCix'),
                'ruc' => $this->env('ADMIN_TENANT_RUC', '20123456789'),
                'phone' => $this->env('ADMIN_TENANT_PHONE', '999111222'),
                'address' => $this->env('ADMIN_TENANT_ADDRESS', 'Av. Principal 123'),
                'estado' => 'active',
                'is_demo' => false,
            ]
        );

        if ($tenant->is_demo) {
            $tenant->update(['is_demo' => false]);
        }

        User::updateOrCreate(
            ['email' => $this->env('ADMIN_EMAIL', 'admin@odontocix.com')],
            [
                'name' => 'Super Admin',
                'password' => $this->env('ADMIN_PASSWORD', 'admin123456'),
                'tenant_id' => $tenant->id,
            ]
        )->assignRole('Super Admin');
    }

    /**
     * Crea/actualiza el tenant demo (rollback por request) y su usuario demo.
     */
    private function ensureDemoUser(): void
    {
        $tenant = Tenant::firstOrCreate(
            ['email' => $this->env('DEMO_TENANT_EMAIL', 'demo@odontocix.com')],
            [
                'name' => $this->env('DEMO_TENANT_NAME', 'Clínica Demo'),
                'ruc' => $this->env('DEMO_TENANT_RUC', '12345678901'),
                'phone' => $this->env('DEMO_TENANT_PHONE', '999000000'),
                'address' => $this->env('DEMO_TENANT_ADDRESS', 'Av. Demostración 123'),
                'estado' => 'active',
                'is_demo' => true,
            ]
        );

        if (! $tenant->is_demo) {
            $tenant->update(['is_demo' => true]);
        }

        User::updateOrCreate(
            ['email' => $this->env('DEMO_USER_EMAIL', 'demo@odontocix.com')],
            [
                'name' => 'Usuario Demo',
                'password' => $this->env('DEMO_USER_PASSWORD', 'demo123456'),
                'tenant_id' => $tenant->id,
            ]
        )->assignRole('Super Admin');
    }

    private function env(string $key, string $default): string
    {
        $value = env($key);

        if (! empty($value)) {
            return $value;
        }

        // Fallback a variables antiguas (render.yaml)
        return (string) env(match ($key) {
            'ADMIN_EMAIL' => 'DEMO_ADMIN_EMAIL',
            'ADMIN_PASSWORD' => 'DEMO_ADMIN_PASSWORD',
            default => $key,
        }, $default);
    }
}
