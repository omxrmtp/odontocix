<?php

namespace Tests\Feature;

use App\Models\AvailableSlot;
use App\Models\Doctor;
use Tests\CreatesTenant;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AvailableSlotTest extends TestCase
{
    use RefreshDatabase, CreatesTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();
    }

    public function test_can_list_available_slots(): void
    {
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        AvailableSlot::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'is_available' => true,
        ]);
        AvailableSlot::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'is_available' => false,
        ]);

        $response = $this->getJson('/api/available-slots?doctor_id='.$doctor->id, $this->authHeaders());

        $response->assertOk();
        $this->assertCount(3, $response->json());
    }

    public function test_can_list_all_slots_with_all_param(): void
    {
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        AvailableSlot::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'is_available' => true,
        ]);
        AvailableSlot::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'is_available' => false,
        ]);

        $response = $this->getJson('/api/available-slots?doctor_id='.$doctor->id.'&all=1', $this->authHeaders());

        $response->assertOk();
        $this->assertCount(2, $response->json());
    }

    public function test_can_create_slots_bulk(): void
    {
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);

        $response = $this->postJson('/api/available-slots', [
            'doctor_id' => $doctor->id,
            'start_date' => now()->format('Y-m-d'),
            'end_date' => now()->addDay()->format('Y-m-d'),
            'start_time' => '09:00',
            'end_time' => '11:00',
            'duration_minutes' => 30,
        ], $this->authHeaders());

        $response->assertCreated();
        $this->assertCount(8, $response->json());
    }

    public function test_can_update_slot_status(): void
    {
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        $slot = AvailableSlot::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
        ]);

        $response = $this->putJson("/api/available-slots/{$slot->id}", [
            'is_available' => false,
            'is_booked' => true,
        ], $this->authHeaders());

        $response->assertOk();
        $this->assertDatabaseHas('available_slots', [
            'id' => $slot->id,
            'is_available' => false,
            'is_booked' => true,
        ]);
    }

    public function test_can_delete_slot(): void
    {
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        $slot = AvailableSlot::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
        ]);

        $response = $this->deleteJson("/api/available-slots/{$slot->id}", [], $this->authHeaders());

        $response->assertOk();
        $this->assertModelMissing($slot);
    }
}
