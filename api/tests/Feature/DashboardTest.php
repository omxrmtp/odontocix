<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Budget;
use App\Models\CashTransaction;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Payment;
use Tests\CreatesTenant;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class DashboardTest extends TestCase
{
    use RefreshDatabase, CreatesTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();
    }

    public function test_stats_endpoint_returns_expected_structure(): void
    {
        Appointment::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => Patient::factory()->create(['tenant_id' => $this->tenant->id])->id,
            'doctor_id' => Doctor::factory()->create(['tenant_id' => $this->tenant->id])->id,
        ]);

        Payment::factory()->count(2)->create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => Patient::factory()->create(['tenant_id' => $this->tenant->id])->id,
            'budget_id' => Budget::factory()->create(['tenant_id' => $this->tenant->id])->id,
        ]);

        $response = $this->getJson('/api/dashboard/stats', $this->authHeaders());

        $response->assertOk()
            ->assertJsonStructure([
                'patients_today', 'appointments_today', 'appointments_upcoming',
                'income_today', 'income_month', 'expenses_month', 'balance',
                'top_treatments', 'recent_appointments', 'recent_payments',
            ]);
    }

    public function test_charts_endpoint_returns_expected_structure(): void
    {
        $response = $this->getJson('/api/dashboard/charts', $this->authHeaders());

        $response->assertOk()
            ->assertJsonStructure([
                'appointments_by_day', 'income_by_month', 'income_by_category',
            ]);
    }

    public function test_stats_requires_authentication(): void
    {
        $response = $this->getJson('/api/dashboard/stats');
        $response->assertUnauthorized();
    }
}
