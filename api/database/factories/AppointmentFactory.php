<?php

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

class AppointmentFactory extends Factory
{
    protected $model = Appointment::class;

    public function definition(): array
    {
        $start = $this->faker->dateTimeBetween('now', '+1 month');
        $end = (clone $start)->modify('+30 minutes');

        return [
            'tenant_id' => Tenant::factory(),
            'patient_id' => Patient::factory(),
            'doctor_id' => Doctor::factory(),
            'start_date' => $start,
            'end_date' => $end,
            'status' => $this->faker->randomElement(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled']),
            'reason' => $this->faker->sentence(),
            'notes' => $this->faker->sentence(),
        ];
    }
}
