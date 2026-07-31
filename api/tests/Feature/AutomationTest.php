<?php

namespace Tests\Feature;

use App\Models\AvailableSlot;
use App\Models\Doctor;
use App\Models\Patient;
use Tests\CreatesTenant;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AutomationTest extends TestCase
{
    use RefreshDatabase, CreatesTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();
    }

    public function test_can_create_automation_token(): void
    {
        $response = $this->postJson('/api/automation/tokens', [
            'name'   => 'WhatsApp Bot',
            'scopes' => ['patients:write', 'appointments:write', 'availability:read'],
        ], $this->authHeaders());

        $response->assertCreated()
            ->assertJsonPath('name', 'WhatsApp Bot')
            ->assertJsonPath('scopes', ['patients:write', 'appointments:write', 'availability:read'])
            ->assertJsonStructure(['token']);
    }

    public function test_can_list_automation_tokens(): void
    {
        $this->user->createToken('automation:Bot 1', ['patients:read']);
        $this->user->createToken('automation:Bot 2', ['appointments:read']);

        $response = $this->getJson('/api/automation/tokens', $this->authHeaders());

        $response->assertOk()
            ->assertJsonCount(2);
    }

    public function test_can_revoke_automation_token(): void
    {
        $token = $this->user->createToken('automation:Bot 1', ['patients:read']);

        $response = $this->deleteJson('/api/automation/tokens/'.$token->accessToken->id, [], $this->authHeaders());

        $response->assertOk()
            ->assertJsonPath('message', 'Token revocado.');
    }

    public function test_automation_availability_requires_scope(): void
    {
        $token = $this->user->createToken('automation:test', ['patients:read'])->plainTextToken;
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);

        $response = $this->getJson('/api/automation/availability?doctor_id='.$doctor->id.'&date='.now()->addDay()->format('Y-m-d'), [
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ]);

        $response->assertForbidden()
            ->assertJsonPath('message', 'No tienes permiso para realizar esta acción (availability:read).');
    }

    public function test_automation_upsert_patient_with_valid_scope(): void
    {
        $token = $this->user->createToken('automation:test', ['patients:write'])->plainTextToken;

        $response = $this->postJson('/api/automation/patients', [
            'dni'             => '12345678',
            'first_name'      => 'Juan',
            'first_last_name' => 'Pérez',
            'phone'           => '999999999',
        ], [
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ]);

        $response->assertCreated()
            ->assertJsonPath('created', true)
            ->assertJsonPath('patient.dni', '12345678');
    }

    public function test_automation_upsert_patient_returns_existing(): void
    {
        $token = $this->user->createToken('automation:test', ['patients:write'])->plainTextToken;
        Patient::factory()->create(['tenant_id' => $this->tenant->id, 'dni' => '12345678']);

        $response = $this->postJson('/api/automation/patients', [
            'dni'             => '12345678',
            'first_name'      => 'Juan',
            'first_last_name' => 'Pérez',
        ], [
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ]);

        $response->assertOk()
            ->assertJsonPath('created', false)
            ->assertJsonPath('message', 'Paciente ya existente.');
    }

    public function test_automation_idempotency_prevents_duplicates(): void
    {
        $token = $this->user->createToken('automation:test', ['patients:write'])->plainTextToken;
        $headers = [
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
            'Idempotency-Key' => 'abc-123',
        ];

        $payload = [
            'dni'             => '11111111',
            'first_name'      => 'Ana',
            'first_last_name' => 'López',
        ];

        $response1 = $this->postJson('/api/automation/patients', $payload, $headers);
        $response1->assertCreated();

        $response2 = $this->postJson('/api/automation/patients', $payload, $headers);
        $response2->assertOk()
            ->assertJsonPath('created', true); // idempotency devuelve la misma respuesta cacheada

        $this->assertDatabaseCount('patients', 1);
    }

    public function test_automation_book_appointment(): void
    {
        $token = $this->user->createToken('automation:test', ['appointments:write'])->plainTextToken;
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        $slot = AvailableSlot::factory()->create([
            'tenant_id'    => $this->tenant->id,
            'doctor_id'    => $doctor->id,
            'date'         => now()->addDay()->format('Y-m-d'),
            'is_available' => true,
            'is_booked'    => false,
        ]);

        $response = $this->postJson('/api/automation/appointments', [
            'slot_id'       => $slot->id,
            'patient_name'  => 'Carlos Ruiz',
            'patient_phone' => '999000111',
            'patient_dni'   => '22222222',
            'reason'        => 'Revisión',
        ], [
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Cita reservada con éxito.')
            ->assertJsonStructure([
                'message',
                'appointment' => ['id', 'patient_name', 'doctor_name'],
            ]);
    }
}
