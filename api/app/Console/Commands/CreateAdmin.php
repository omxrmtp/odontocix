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
    protected $description = 'Create or reset the super admin user for demo';

    public function handle(): int
    {
        $email = env('DEMO_ADMIN_EMAIL', 'admin@odontocix.com');
        $password = env('DEMO_ADMIN_PASSWORD', 'admin123456');

        $this->info("Email: {$email}");

        // Ensure role exists
        if (!Role::where('name', 'Super Admin')->exists()) {
            $this->error('Super Admin role not found. Run RoleSeeder first.');
            return 1;
        }

        // Ensure tenant exists
        $tenant = Tenant::firstOrCreate(
            ['email' => env('DEMO_TENANT_EMAIL', 'demo@odontocix.com')],
            [
                'name' => 'Clinica Demo',
                'ruc' => '12345678901',
                'phone' => '999000000',
                'address' => 'Av. Demostracion 123',
                'estado' => 'active',
            ]
        );
        $this->info("Tenant: {$tenant->name} ({$tenant->id})");

        // Create or update admin user
        $user = User::where('email', $email)->first();

        if (!$user) {
            $user = new User();
            $user->name = 'Super Admin';
            $user->email = $email;
            $user->password = $password;
            $user->tenant_id = $tenant->id;
            $user->save();
            $user->assignRole('Super Admin');
            $this->info("Admin user CREATED (id={$user->id})");
        } else {
            $user->password = $password;
            $user->tenant_id = $tenant->id;
            $user->save();
            if (!$user->hasRole('Super Admin')) {
                $user->assignRole('Super Admin');
            }
            $this->info("Admin user UPDATED (id={$user->id})");
        }

        // Verify password hash
        $fresh = User::where('email', $email)->first();
        $check = Hash::check($password, $fresh->password);
        $this->info("Password verify: " . ($check ? 'OK' : 'FAILED'));

        return 0;
    }
}
