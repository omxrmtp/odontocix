<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Budget;
use App\Models\BudgetItem;
use App\Models\CashTransaction;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\PatientTreatment;
use App\Models\Payment;
use App\Models\Treatment;
use Tests\CreatesTenant;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ReportTest extends TestCase
{
    use RefreshDatabase, CreatesTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();
    }

    public function test_income_report_returns_expected_structure(): void
    {
        $patient = Patient::factory()->create(['tenant_id' => $this->tenant->id]);
        $budget = Budget::factory()->create(['tenant_id' => $this->tenant->id, 'patient_id' => $patient->id]);

        Payment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'budget_id' => $budget->id,
            'amount' => 100,
            'payment_date' => now(),
        ]);

        CashTransaction::factory()->create([
            'tenant_id' => $this->tenant->id,
            'type' => 'expense',
            'amount' => 50,
            'transaction_date' => now(),
            'concept' => 'Test expense',
        ]);

        $response = $this->getJson('/api/reports/income?from=' . now()->format('Y-m-d') . '&to=' . now()->format('Y-m-d') . '&group_by=day', $this->authHeaders());

        $response->assertOk()
            ->assertJsonStructure([
                'from', 'to', 'group_by',
                'data' => [
                    '*' => ['date', 'total_income', 'total_expenses', 'net_balance', 'payment_methods'],
                ],
            ]);
    }

    public function test_treatment_report_returns_expected_structure(): void
    {
        $patient = Patient::factory()->create(['tenant_id' => $this->tenant->id]);
        $budget = Budget::factory()->create(['tenant_id' => $this->tenant->id, 'patient_id' => $patient->id]);
        $treatment = Treatment::factory()->create(['tenant_id' => $this->tenant->id]);

        BudgetItem::factory()->create([
            'tenant_id' => $this->tenant->id,
            'budget_id' => $budget->id,
            'treatment_id' => $treatment->id,
            'quantity' => 2,
            'unit_price' => 100,
            'subtotal' => 200,
        ]);

        $response = $this->getJson('/api/reports/treatments?from=' . now()->format('Y-m-d') . '&to=' . now()->format('Y-m-d'), $this->authHeaders());

        $response->assertOk()
            ->assertJsonStructure([
                'from', 'to',
                'data' => [
                    '*' => ['treatment_name', 'quantity', 'revenue', 'avg_price'],
                ],
            ]);
    }

    public function test_doctor_productivity_returns_expected_structure(): void
    {
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        $patient = Patient::factory()->create(['tenant_id' => $this->tenant->id]);
        $treatment = Treatment::factory()->create(['tenant_id' => $this->tenant->id]);

        Appointment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'start_date' => now(),
        ]);

        PatientTreatment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'treatment_id' => $treatment->id,
            'doctor_id' => $doctor->id,
            'status' => 'completado',
            'agreed_price' => 150,
        ]);

        $response = $this->getJson('/api/reports/doctors?from=' . now()->format('Y-m-d') . '&to=' . now()->format('Y-m-d'), $this->authHeaders());

        $response->assertOk()
            ->assertJsonStructure([
                'from', 'to',
                'data' => [
                    '*' => ['doctor_name', 'appointments_count', 'treatments_completed', 'revenue_generated'],
                ],
            ]);
    }

    public function test_patient_retention_returns_expected_structure(): void
    {
        $patient = Patient::factory()->create(['tenant_id' => $this->tenant->id]);

        Appointment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'start_date' => now(),
        ]);

        $response = $this->getJson('/api/reports/patients?from=' . now()->format('Y-m-d') . '&to=' . now()->format('Y-m-d'), $this->authHeaders());

        $response->assertOk()
            ->assertJsonStructure([
                'from', 'to', 'new_patients', 'returning_patients', 'retention_rate',
            ]);
    }

    public function test_income_report_requires_authentication(): void
    {
        $response = $this->getJson('/api/reports/income?from=' . now()->format('Y-m-d') . '&to=' . now()->format('Y-m-d') . '&group_by=day');
        $response->assertUnauthorized();
    }
}
