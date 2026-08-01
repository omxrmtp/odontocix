<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\AvailableSlot;
use App\Models\Budget;
use App\Models\BudgetItem;
use App\Models\CashTransaction;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\Treatment;
use App\Models\User;
use App\Services\TenantService;
use Illuminate\Database\Seeder;

class DemoSeeder extends Seeder
{
    public function run(TenantService $tenantService): void
    {
        $tenant = Tenant::where('is_demo', true)->first()
            ?? Tenant::firstOrCreate(
                ['email' => env('DEMO_TENANT_EMAIL', 'demo@odontocix.com')],
                [
                    'name' => env('DEMO_TENANT_NAME', 'Clínica Demo'),
                    'ruc' => env('DEMO_TENANT_RUC', '12345678901'),
                    'phone' => env('DEMO_TENANT_PHONE', '999000000'),
                    'address' => env('DEMO_TENANT_ADDRESS', 'Av. Demostración 123'),
                    'estado' => 'active',
                    'is_demo' => true,
                ]
            );

        if (! $tenant->is_demo) {
            $tenant->update(['is_demo' => true]);
        }

        $tenantService->setCurrent($tenant);

        $this->call(TreatmentSeeder::class);
        $this->call(ConsentTemplateSeeder::class);
        $this->call(InventorySeeder::class);

        if (Patient::where('tenant_id', $tenant->id)->exists()) {
            $this->command->info('DemoSeeder: el tenant demo ya tiene datos de muestra. Omitido.');

            return;
        }

        $user = User::where('tenant_id', $tenant->id)->first();

        $doctors = [];
        foreach ([
            ['Ana', 'Quispe', 'Rojas', '123456', 'Odontología General', 'ana.quispe@demo.com'],
            ['Carlos', 'López', 'Sánchez', '654321', 'Ortodoncia', 'carlos.lopez@demo.com'],
            ['María', 'Fernández', 'Torres', '789012', 'Endodoncia', 'maria.fernandez@demo.com'],
        ] as [$first, $firstLast, $secondLast, $cmp, $specialty, $email]) {
            $doctors[] = Doctor::create([
                'tenant_id' => $tenant->id,
                'first_name' => $first,
                'first_last_name' => $firstLast,
                'second_last_name' => $secondLast,
                'cmp' => $cmp,
                'specialty' => $specialty,
                'phone' => '999'.$cmp,
                'email' => $email,
            ]);
        }

        $patients = [];
        foreach ([
            ['Luis', 'García', 'Paredes', '45123456', 'luis.garcia@gmail.com', '999123456'],
            ['Rosa', 'Chávez', 'Díaz', '45234567', 'rosa.chavez@gmail.com', '998234567'],
            ['Pedro', 'Ramos', 'Silva', '45345678', 'pedro.ramos@gmail.com', '997345678'],
            ['Lucía', 'Mendoza', 'Flores', '45456789', 'lucia.mendoza@gmail.com', '996456789'],
            ['Jorge', 'Vargas', 'Castro', '45567890', 'jorge.vargas@gmail.com', '995567890'],
            ['Carmen', 'Salas', 'Ríos', '45678901', 'carmen.salas@gmail.com', '994678901'],
            ['Miguel', 'Torres', 'Vega', '45789012', 'miguel.torres@gmail.com', '993789012'],
            ['Sofía', 'Rojas', 'Medina', '45890123', 'sofia.rojas@gmail.com', '992890123'],
        ] as [$first, $firstLast, $secondLast, $dni, $email, $phone]) {
            $patients[] = Patient::create([
                'tenant_id' => $tenant->id,
                'dni' => $dni,
                'first_name' => $first,
                'second_name' => null,
                'first_last_name' => $firstLast,
                'second_last_name' => $secondLast,
                'phone' => $phone,
                'email' => $email,
                'address' => 'Av. Muestra '.rand(100, 999).' - Lima',
                'gender' => rand(0, 1) ? 'M' : 'F',
                'birth_date' => now()->subYears(rand(18, 70)),
                'blood_type' => ['A+', 'B+', 'O+', 'AB-'][rand(0, 3)],
            ]);
        }

        $treatments = Treatment::where('tenant_id', $tenant->id)->get();

        $statusCycle = ['completed', 'completed', 'completed', 'confirmed', 'scheduled', 'scheduled'];
        $dates = collect(range(1, 12))->map(fn ($i) => now()->subDays(rand(0, 60))->addDays($i)->setTime(rand(8, 17), rand(0, 3) * 15));

        foreach ($patients as $i => $patient) {
            $doctor = $doctors[$i % count($doctors)];
            $date = $dates[$i % count($dates)]->copy();

            Appointment::create([
                'tenant_id' => $tenant->id,
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'start_date' => $date,
                'end_date' => $date->copy()->addMinutes(30),
                'status' => $statusCycle[$i % count($statusCycle)],
                'reason' => ['Consulta general', 'Limpieza dental', 'Control', 'Dolor dental'][$i % 4],
                'whatsapp_patient_sent' => false,
                'whatsapp_doctor_sent' => false,
            ]);

            if ($i % 2 === 0) {
                $budget = Budget::create([
                    'tenant_id' => $tenant->id,
                    'patient_id' => $patient->id,
                    'discount_type' => 'percent',
                    'discount_percent' => 0,
                    'discount_amount' => 0,
                    'status' => $i % 4 === 0 ? 'approved' : 'sent',
                    'notes' => 'Presupuesto de demostración',
                ]);

                $selected = $treatments->random(min(3, $treatments->count()));
                $subtotal = 0;
                foreach ($selected as $treatment) {
                    $line = (float) $treatment->base_price;
                    $subtotal += $line;
                    BudgetItem::create([
                        'tenant_id' => $tenant->id,
                        'budget_id' => $budget->id,
                        'treatment_id' => $treatment->id,
                        'description' => $treatment->name,
                        'quantity' => 1,
                        'unit_price' => $line,
                        'subtotal' => $line,
                    ]);
                }

                $budget->update([
                    'total' => $subtotal,
                    'grand_total' => $subtotal,
                ]);

                if ($i % 4 === 0) {
                    Payment::create([
                        'tenant_id' => $tenant->id,
                        'budget_id' => $budget->id,
                        'patient_id' => $patient->id,
                        'amount' => round($subtotal * 0.5, 2),
                        'payment_date' => now()->subDays(rand(1, 15))->toDateString(),
                        'method' => ['cash', 'card', 'transfer'][$i % 3],
                        'notes' => 'Pago inicial demo',
                    ]);
                }
            }
        }

        foreach ($doctors as $doctor) {
            foreach (range(0, 6) as $day) {
                $date = now()->addDays($day)->toDateString();
                foreach (['08:00:00', '09:00:00', '10:00:00', '11:00:00', '15:00:00', '16:00:00'] as $time) {
                    AvailableSlot::create([
                        'tenant_id' => $tenant->id,
                        'doctor_id' => $doctor->id,
                        'date' => $date,
                        'start_time' => $time,
                        'end_time' => date('H:i:00', strtotime($time) + 1800),
                        'is_available' => true,
                        'is_booked' => false,
                    ]);
                }
            }
        }

        foreach (['income' => 5, 'expense' => 3] as $type => $count) {
            foreach (range(1, $count) as $i) {
                CashTransaction::create([
                    'tenant_id' => $tenant->id,
                    'type' => $type,
                    'amount' => $type === 'income'
                        ? rand(50, 2000)
                        : rand(20, 600),
                    'category' => $type === 'income'
                        ? ['consulta', 'tratamiento', 'otros'][rand(0, 2)]
                        : ['insumos', 'servicios', 'equipamiento'][rand(0, 2)],
                    'concept' => $type === 'income'
                        ? 'Pago de servicio'
                        : 'Compra de insumos',
                    'transaction_date' => now()->subDays(rand(1, 30))->toDateString(),
                    'user_id' => $user?->id,
                ]);
            }
        }

        $this->command->info('DemoSeeder: datos de muestra creados para el tenant demo.');
    }
}
