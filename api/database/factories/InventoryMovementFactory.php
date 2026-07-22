<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\InventoryMovement;
use App\Models\InventoryItem;
use App\Models\User;

class InventoryMovementFactory extends Factory
{
    protected $model = InventoryMovement::class;

    public function definition(): array
    {
        return [
            'inventory_item_id' => InventoryItem::factory(),
            'type' => $this->faker->randomElement(['entry', 'exit', 'adjustment']),
            'quantity' => $this->faker->numberBetween(1, 20),
            'reason' => $this->faker->optional()->sentence(),
            'user_id' => User::factory(),
        ];
    }
}
