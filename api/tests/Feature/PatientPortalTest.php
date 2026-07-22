<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Budget;
use App\Models\ClinicalRecord;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\PatientTreatment;
use App\Models\Treatment;
use Tests\CreatesTenant;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PatientPortalTest extends TestCase
{
    use RefreshDatabase, CreatesTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();
    }

    public function test_can_get_patient_data_by_token(): void
    {
        $patient = Patient::factory()->create([
            'tenant_id' => $this->tenant->id,
            'portal_token' => 'abc123',
        ]);

        $response = $this->getJson('/api/portal/patient/abc123');

        $response->assertOk()
            ->assertJson([
                'id' => $patient->id,
                'first_name' => $patient->first_name,
                'phone' => $patient->phone,
                'email' => $patient->email,
            ]);
    }

    public function test_returns_404_for_invalid_token(): void
    {
        $response = $this->getJson('/api/portal/patient/invalid');
        $response->assertNotFound();
    }

    public function test_can_get_upcoming_appointments(): void
    {
        $patient = Patient::factory()->create([
            'tenant_id' => $this->tenant->id,
            'portal_token' => 'token123',
        ]);
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);

        $upcoming = Appointment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'start_date' => now()->addDay(),
            'status' => 'scheduled',
        ]);

        $past = Appointment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'start_date' => now()->subDay(),
            'status' => 'completed',
        ]);

        $cancelled = Appointment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'start_date' => now()->addDay(),
            'status' => 'cancelled',
        ]);

        $response = $this->getJson('/api/portal/patient/token123/appointments');

        $response->assertOk();
        $ids = collect($response->json())->pluck('id');
        $this->assertTrue($ids->contains($upcoming->id));
        $this->assertFalse($ids->contains($past->id));
        $this->assertFalse($ids->contains($cancelled->id));
    }

    public function test_can_get_history(): void
    {
        $patient = Patient::factory()->create([
            'tenant_id' => $this->tenant->id,
            'portal_token' => 'history123',
        ]);
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        $treatment = Treatment::factory()->create(['tenant_id' => $this->tenant->id]);

        \App\Models\ClinicalRecord::create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'record_date' => now(),
            'reason' => 'Consulta general',
            'diagnosis' => 'Caries',
        ]);

        PatientTreatment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'treatment_id' => $treatment->id,
            'doctor_id' => $doctor->id,
            'status' => 'completed',
        ]);

        $response = $this->getJson('/api/portal/patient/history123/history');

        $response->assertOk()
            ->assertJsonStructure(['clinical_records', 'treatments']);
    }

    public function test_can_get_budgets(): void
    {
        $patient = Patient::factory()->create([
            'tenant_id' => $this->tenant->id,
            'portal_token' => 'budget123',
        ]);

        Budget::factory()->create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'status' => 'approved',
            'grand_total' => 500,
        ]);

        $response = $this->getJson('/api/portal/patient/budget123/budgets');

        $response->assertOk();
        $data = $response->json();
        $this->assertCount(1, $data);
        $this->assertEquals('approved', $data[0]['status']);
        $this->assertArrayHasKey('balance', $data[0]);
    }

    public function test_store_generates_portal_token(): void
    {
        $data = Patient::factory()->make(['tenant_id' => $this->tenant->id])->toArray();

        $response = $this->postJson('/api/patients', $data, $this->authHeaders());

        $response->assertCreated();
        $this->assertNotNull($response->json('portal_token'));
    }

    public function test_update_generates_portal_token_if_missing(): void
    {
        $patient = Patient::factory()->create([
            'tenant_id' => $this->tenant->id,
            'portal_token' => null,
        ]);

        $response = $this->putJson("/api/patients/{$patient->id}", [
            'first_name' => 'Updated',
        ], $this->authHeaders());

        $response->assertOk();
        $this->assertNotNull($patient->fresh()->portal_token);
    }
}