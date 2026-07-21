<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        Role::create(['name' => 'Super Admin', 'guard_name' => 'web']);
        Role::create(['name' => 'Admin Clinica', 'guard_name' => 'web']);
        Role::create(['name' => 'Doctor', 'guard_name' => 'web']);
        Role::create(['name' => 'Recepcionista', 'guard_name' => 'web']);
        Role::create(['name' => 'Cajero', 'guard_name' => 'web']);
    }
}
