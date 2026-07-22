<?php

namespace Database\Factories;

use App\Models\BudgetItem;
use App\Models\Budget;
use App\Models\Treatment;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

class BudgetItemFactory extends Factory
{
    protected $model = BudgetItem::class;

    public function definition(): array
    {
        $qty = $this->faker->randomDigitNotNull();
        $price = $this->faker->randomFloat(2, 20, 1000);

        return [
            'tenant_id' => Tenant::factory(),
            'budget_id' => Budget::factory(),
            'treatment_id' => Treatment::factory(),
            'description' => $this->faker->sentence(3),
            'tooth_fdi' => $this->faker->randomElement([null, '11', '12', '21', '22', '31', '32', '41', '42']),
            'quantity' => $qty,
            'unit_price' => $price,
            'subtotal' => $qty * $price,
        ];
    }
}
