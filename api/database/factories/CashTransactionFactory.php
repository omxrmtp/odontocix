<?php

namespace Database\Factories;

use App\Models\CashTransaction;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CashTransactionFactory extends Factory
{
    protected $model = CashTransaction::class;

    public function definition(): array
    {
        $type = $this->faker->randomElement(['income', 'expense']);

        return [
            'tenant_id' => Tenant::factory(),
            'type' => $type,
            'amount' => $this->faker->randomFloat(2, 10, 3000),
            'category' => $type === 'income'
                ? $this->faker->randomElement(['consulta', 'tratamiento', 'otros'])
                : $this->faker->randomElement(['insumos', 'servicios', 'equipamiento', 'alquiler', 'otros']),
            'concept' => $this->faker->sentence(),
            'transaction_date' => $this->faker->date(),
            'user_id' => User::factory(),
        ];
    }
}
