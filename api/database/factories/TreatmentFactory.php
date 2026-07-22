<?php

namespace Database\Factories;

use App\Models\Treatment;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

class TreatmentFactory extends Factory
{
    protected $model = Treatment::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => $this->faker->randomElement([
                'Limpieza Dental', 'Blanqueamiento', 'Extracción Simple',
                'Endodoncia', 'Corona Dental', 'Puente Dental',
                'Implante Dental', 'Ortodoncia', 'Carilla Estética',
                'Resina', 'Amalgama', 'Sellante'
            ]),
            'description' => $this->faker->sentence(),
            'base_price' => $this->faker->randomFloat(2, 50, 5000),
            'estimated_duration_min' => $this->faker->randomElement([15, 30, 45, 60, 90, 120]),
        ];
    }
}
