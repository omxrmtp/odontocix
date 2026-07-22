<?php

namespace Tests\Feature;

use App\Models\AvailableSlot;
use App\Models\Doctor;
use App\Models\Patient;
use Tests\CreatesTenant;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class OnlineBookingTest extends TestCase
{
    use RefreshDatabase, CreatesTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();
    }

    public function test_can_list_doctors(): void
    {
        Doctor::factory()->count(2)->create(['tenant_id' => $this->tenant->id]);

        $response = $this->getJson('/api/online-booking/doctors?tenant_id='.$this->tenant->id);

        $response->assertOk();
        $this->assertCount(2, $response->json());
    }

    public function test_can_list_available_slots_for_booking(): void
    {
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        $today = now()->format('Y-m-d');
        AvailableSlot::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'date' => $today,
            'is_available' => true,
            'is_booked' => false,
        ]);
        AvailableSlot::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'date' => $today,
            'is_available' => true,
            'is_booked' => true,
        ]);

        $response = $this->getJson('/api/online-booking/slots?tenant_id='.$this->tenant->id.'&doctor_id='.$doctor->id.'&date='.now()->format('Y-m-d'));

        $response->assertOk();
        $this->assertCount(1, $response->json());
    }

    public function test_can_book_appointment(): void
    {
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        $slot = AvailableSlot::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'date' => now()->format('Y-m-d'),
            'start_time' => '10:00:00',
            'end_time' => '10:30:00',
            'is_available' => true,
            'is_booked' => false,
        ]);

        $response = $this->postJson('/api/online-booking/appointments?tenant_id='.$this->tenant->id, [
            'slot_id' => $slot->id,
            'patient_name' => 'Juan Pérez',
            'patient_phone' => '987654321',
            'patient_email' => 'juan@example.com',
            'patient_dni' => '12345678',
            'reason' => 'Consulta general',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('appointments', [
            'doctor_id' => $doctor->id,
            'status' => 'scheduled',
        ]);
        $this->assertDatabaseHas('available_slots', [
            'id' => $slot->id,
            'is_booked' => true,
            'is_available' => false,
        ]);
    }

    public function test_cannot_book_already_booked_slot(): void
    {
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        $slot = AvailableSlot::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'date' => now()->format('Y-m-d'),
            'start_time' => '10:00:00',
            'end_time' => '10:30:00',
            'is_booked' => true,
            'is_available' => false,
        ]);

        $response = $this->postJson('/api/online-booking/appointments?tenant_id='.$this->tenant->id, [
            'slot_id' => $slot->id,
            'patient_name' => 'Juan Pérez',
            'patient_phone' => '987654321',
            'patient_email' => 'juan@example.com',
            'patient_dni' => '12345678',
            'reason' => 'Consulta general',
        ]);

        $response->assertStatus(409);
    }

    public function test_uses_existing_patient_by_dni(): void
    {
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        $patient = Patient::factory()->create([
            'tenant_id' => $this->tenant->id,
            'dni' => '12345678',
        ]);
        $slot = AvailableSlot::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'date' => now()->format('Y-m-d'),
            'start_time' => '10:00:00',
            'end_time' => '10:30:00',
            'is_available' => true,
            'is_booked' => false,
        ]);

        $response = $this->postJson('/api/online-booking/appointments?tenant_id='.$this->tenant->id, [
            'slot_id' => $slot->id,
            'patient_name' => 'Otro Nombre',
            'patient_phone' => '999999999',
            'patient_email' => 'otro@example.com',
            'patient_dni' => '12345678',
            'reason' => 'Control',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('appointments', [
            'patient_id' => $patient->id,
        ]);
    }
}
