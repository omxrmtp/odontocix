<?php

namespace Database\Factories;

use App\Models\Payment;
use App\Models\Budget;
use App\Models\Patient;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'budget_id' => Budget::factory(),
            'patient_id' => Patient::factory(),
            'amount' => $this->faker->randomFloat(2, 50, 2000),
            'payment_date' => $this->faker->date(),
            'method' => $this->faker->randomElement(['cash', 'card', 'transfer']),
            'reference' => $this->faker->optional()->word(),
            'notes' => $this->faker->optional()->sentence(),
        ];
    }
}
