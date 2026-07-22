<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::firstOrCreate(
            ['email' => env('DEMO_TENANT_EMAIL', 'demo@odontocix.com')],
            [
                'name' => env('DEMO_TENANT_NAME', 'Clínica Demo'),
                'ruc' => env('DEMO_TENANT_RUC', '12345678901'),
                'phone' => env('DEMO_TENANT_PHONE', '999000000'),
                'address' => env('DEMO_TENANT_ADDRESS', 'Av. Demostración 123'),
                'estado' => 'active',
            ]
        );

        User::firstOrCreate(
            ['email' => env('DEMO_ADMIN_EMAIL', 'admin@odontocix.com')],
            [
                'name' => 'Super Admin',
                'password' => Hash::make(env('DEMO_ADMIN_PASSWORD', 'admin123456')),
                'tenant_id' => $tenant->id,
            ]
        )->assignRole('Super Admin');
    }
}
