<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

class AuditLogSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('testing')) {
            return;
        }

        $tenant = Tenant::where('is_demo', true)->first() ?? Tenant::first();
        if (! $tenant) {
            return;
        }

        $user = User::where('tenant_id', $tenant->id)->first();
        if (! $user) {
            return;
        }

        // Sample audit logs for demonstration
        $actions = ['created', 'updated', 'deleted', 'viewed'];
        $resources = ['Patient', 'Doctor', 'Appointment', 'Budget', 'Payment', 'Treatment', 'ClinicalRecord'];

        foreach ($resources as $resource) {
            foreach (['created', 'updated'] as $action) {
                AuditLog::create([
                    'tenant_id' => $tenant->id,
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'action' => $action,
                    'resource_type' => $resource,
                    'resource_id' => rand(1, 100),
                    'old_values' => $action === 'updated' ? ['name' => 'Valor anterior'] : null,
                    'new_values' => $action === 'updated' ? ['name' => 'Valor nuevo'] : ['name' => 'Nuevo registro'],
                    'ip_address' => '127.0.0.1',
                    'created_at' => now()->subDays(rand(0, 30)),
                ]);
            }
        }
    }
}
