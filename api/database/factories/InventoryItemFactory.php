<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\InventoryItem;

class InventoryItemFactory extends Factory
{
    protected $model = InventoryItem::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->word(),
            'description' => $this->faker->sentence(),
            'category' => $this->faker->randomElement(['insumos', 'equipos', 'medicamentos', 'otros']),
            'sku' => strtoupper($this->faker->bothify('???-###')),
            'quantity' => $this->faker->numberBetween(0, 100),
            'min_stock' => $this->faker->numberBetween(1, 20),
            'unit' => $this->faker->randomElement(['unidad', 'caja', 'frasco', 'bolsa', 'paquete']),
            'unit_cost' => $this->faker->randomFloat(2, 1, 500),
            'supplier' => $this->faker->company(),
            'location' => $this->faker->randomElement(['Almacén', 'Consultorio 1', 'Farmacia']),
            'expiration_date' => $this->faker->optional()->date(),
        ];
    }
}
