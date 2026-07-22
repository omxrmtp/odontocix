<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

class PatientFactory extends Factory
{
    protected $model = Patient::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'dni' => $this->faker->numerify('########'),
            'first_name' => $this->faker->firstName(),
            'second_name' => $this->faker->firstName(),
            'first_last_name' => $this->faker->lastName(),
            'second_last_name' => $this->faker->lastName(),
            'phone' => $this->faker->phoneNumber(),
            'email' => $this->faker->email(),
            'address' => $this->faker->address(),
            'reference' => $this->faker->sentence(),
            'blood_type' => $this->faker->randomElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
            'birth_date' => $this->faker->date(max: '-18 years'),
            'gender' => $this->faker->randomElement(['M', 'F']),
            'observations' => $this->faker->sentence(),
        ];
    }
}
