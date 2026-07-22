<?php

namespace Database\Factories;

use App\Models\Doctor;
use App\Models\Patient;
use App\Models\PatientTreatment;
use App\Models\Tenant;
use App\Models\Treatment;
use Illuminate\Database\Eloquent\Factories\Factory;

class PatientTreatmentFactory extends Factory
{
    protected $model = PatientTreatment::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'patient_id' => Patient::factory(),
            'treatment_id' => Treatment::factory(),
            'doctor_id' => Doctor::factory(),
            'status' => $this->faker->randomElement(['pendiente', 'en_proceso', 'completado', 'cancelado']),
            'agreed_price' => $this->faker->randomFloat(2, 50, 500),
            'tooth_fdi' => $this->faker->randomElement(['11', '12', '21', '22', '36', '37', '46', '47']),
        ];
    }
}
