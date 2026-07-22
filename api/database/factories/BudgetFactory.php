<?php

namespace Database\Factories;

use App\Models\Budget;
use App\Models\BudgetItem;
use App\Models\Treatment;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

class BudgetFactory extends Factory
{
    protected $model = Budget::class;

    public function definition(): array
    {
        $total = $this->faker->randomFloat(2, 100, 5000);
        $discountPercent = $this->faker->randomFloat(2, 0, 30);
        $discountAmount = $total * ($discountPercent / 100);

        return [
            'tenant_id' => Tenant::factory(),
            'patient_id' => \App\Models\Patient::factory(),
            'total' => $total,
            'discount_percent' => $discountPercent,
            'discount_amount' => $discountAmount,
            'grand_total' => $total - $discountAmount,
            'status' => $this->faker->randomElement(['draft', 'sent', 'approved', 'rejected']),
            'financing' => $this->faker->optional()->randomElement([
                ['initial' => 200, 'installments' => 3, 'amount_per_installment' => 150],
                ['initial' => 500, 'installments' => 6, 'amount_per_installment' => 100],
            ]),
            'notes' => $this->faker->optional()->sentence(),
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (Budget $budget) {
            $treatment = \App\Models\Treatment::factory()->create(['tenant_id' => $budget->tenant_id]);
            BudgetItem::factory()->count(rand(1, 3))->create([
                'budget_id' => $budget->id,
                'tenant_id' => $budget->tenant_id,
                'treatment_id' => $treatment->id,
            ]);
        });
    }
}
