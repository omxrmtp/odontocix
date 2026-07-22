<?php

namespace Tests\Feature;

use App\Models\Patient;
use Tests\CreatesTenant;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PatientTest extends TestCase
{
    use RefreshDatabase, CreatesTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();
    }

    public function test_can_list_patients(): void
    {
        Patient::factory()->count(3)->create(['tenant_id' => $this->tenant->id]);

        $response = $this->getJson('/api/patients', $this->authHeaders());

        $response->assertOk()
            ->assertJsonStructure(['data']);
        $this->assertCount(3, $response->json('data'));
    }

    public function test_can_create_patient(): void
    {
        $data = Patient::factory()->make(['tenant_id' => $this->tenant->id])->toArray();

        $response = $this->postJson('/api/patients', $data, $this->authHeaders());

        $response->assertCreated()
            ->assertJsonStructure(['id', 'dni', 'first_name']);
    }

    public function test_can_show_patient(): void
    {
        $patient = Patient::factory()->create(['tenant_id' => $this->tenant->id]);

        $response = $this->getJson("/api/patients/{$patient->id}", $this->authHeaders());

        $response->assertOk()
            ->assertJson(['id' => $patient->id]);
    }

    public function test_can_update_patient(): void
    {
        $patient = Patient::factory()->create(['tenant_id' => $this->tenant->id]);

        $response = $this->putJson("/api/patients/{$patient->id}", [
            'first_name' => 'Updated',
        ], $this->authHeaders());

        $response->assertOk();
        $this->assertEquals('Updated', $patient->fresh()->first_name);
    }

    public function test_can_delete_patient(): void
    {
        $patient = Patient::factory()->create(['tenant_id' => $this->tenant->id]);

        $response = $this->deleteJson("/api/patients/{$patient->id}", [], $this->authHeaders());

        $response->assertOk();
        $this->assertModelMissing($patient);
    }
}
