<?php

namespace Database\Factories;

use App\Models\Doctor;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

class DoctorFactory extends Factory
{
    protected $model = Doctor::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'first_name' => $this->faker->firstName(),
            'first_last_name' => $this->faker->lastName(),
            'second_last_name' => $this->faker->lastName(),
            'cmp' => $this->faker->numerify('######'),
            'specialty' => $this->faker->randomElement(['Odontología General', 'Ortodoncia', 'Endodoncia', 'Periodoncia', 'Cirugía Oral']),
            'phone' => $this->faker->phoneNumber(),
            'email' => $this->faker->email(),
        ];
    }
}
