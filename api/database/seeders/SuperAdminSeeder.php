<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'admin@odontocix.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('admin123456'),
                'tenant_id' => null,
            ]
        );

        $user->assignRole('Super Admin');
    }
}
