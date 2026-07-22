<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use Illuminate\Database\Seeder;

class AuditLogSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('testing')) {
            return;
        }

        // Sample audit logs for demonstration
        $actions = ['created', 'updated', 'deleted', 'viewed'];
        $resources = ['Patient', 'Doctor', 'Appointment', 'Budget', 'Payment', 'Treatment', 'ClinicalRecord'];

        foreach ($resources as $resource) {
            foreach (['created', 'updated'] as $action) {
                AuditLog::create([
                    'tenant_id' => 1,
                    'user_id' => 1,
                    'user_name' => 'Admin',
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
