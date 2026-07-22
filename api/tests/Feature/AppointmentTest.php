<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Patient;
use Tests\CreatesTenant;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AppointmentTest extends TestCase
{
    use RefreshDatabase, CreatesTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();
    }

    public function test_can_list_appointments(): void
    {
        Appointment::factory()->count(3)->create(['tenant_id' => $this->tenant->id]);

        $response = $this->getJson('/api/appointments', $this->authHeaders());

        $response->assertOk();
    }

    public function test_can_create_appointment(): void
    {
        $patient = Patient::factory()->create(['tenant_id' => $this->tenant->id]);
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);

        $response = $this->postJson('/api/appointments', [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'start_date' => now()->addDay()->format('Y-m-d H:i:s'),
            'end_date' => now()->addDay()->addHour()->format('Y-m-d H:i:s'),
            'reason' => 'Dolor de muela',
            'status' => 'scheduled',
        ], $this->authHeaders());

        $response->assertCreated();
    }

    public function test_can_delete_appointment(): void
    {
        $appointment = Appointment::factory()->create(['tenant_id' => $this->tenant->id]);

        $response = $this->deleteJson("/api/appointments/{$appointment->id}", [], $this->authHeaders());

        $response->assertOk();
        $this->assertModelMissing($appointment);
    }

    public function test_can_list_upcoming_appointments_for_reminders(): void
    {
        $patient = Patient::factory()->create(['tenant_id' => $this->tenant->id]);
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);

        $upcoming = Appointment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'start_date' => now()->addHours(30),
            'whatsapp_patient_sent' => false,
            'status' => 'scheduled',
        ]);

        $alreadySent = Appointment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'start_date' => now()->addHours(30),
            'whatsapp_patient_sent' => true,
            'status' => 'scheduled',
        ]);

        $tooSoon = Appointment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'start_date' => now()->addHours(12),
            'whatsapp_patient_sent' => false,
            'status' => 'scheduled',
        ]);

        $response = $this->getJson('/api/appointments/upcoming-for-reminders', $this->authHeaders());

        $response->assertOk();
        $ids = collect($response->json())->pluck('id');
        $this->assertTrue($ids->contains($upcoming->id));
        $this->assertFalse($ids->contains($alreadySent->id));
        $this->assertFalse($ids->contains($tooSoon->id));
    }

    public function test_reminder_command_sends_reminders(): void
    {
        $patient = Patient::factory()->create([
            'tenant_id' => $this->tenant->id,
            'phone' => '987654321',
            'email' => 'test@example.com',
        ]);
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);

        $appointment = Appointment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'start_date' => now()->addHours(30),
            'whatsapp_patient_sent' => false,
            'status' => 'scheduled',
        ]);

        $this->artisan('reminders:send')
            ->assertSuccessful()
            ->expectsOutputToContain('Recordatorios procesados: 1');

        $this->assertDatabaseHas('appointments', [
            'id' => $appointment->id,
            'whatsapp_patient_sent' => true,
        ]);
    }
}
