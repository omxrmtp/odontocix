<?php

namespace Database\Factories;

use App\Models\AvailableSlot;
use App\Models\Doctor;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

class AvailableSlotFactory extends Factory
{
    protected $model = AvailableSlot::class;

    public function definition(): array
    {
        $start = $this->faker->time('H:i:00');
        $end = date('H:i:00', strtotime($start) + 1800);

        return [
            'tenant_id' => Tenant::factory(),
            'doctor_id' => Doctor::factory(),
            'date' => $this->faker->dateTimeBetween('today', '+1 month')->format('Y-m-d'),
            'start_time' => $start,
            'end_time' => $end,
            'is_available' => true,
            'is_booked' => false,
        ];
    }
}
