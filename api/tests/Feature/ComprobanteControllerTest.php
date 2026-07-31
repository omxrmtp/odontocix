<?php

namespace Tests\Feature;

use App\Jobs\SendComprobante;
use App\Models\Budget;
use App\Models\BudgetItem;
use App\Models\Comprobante;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Treatment;
use App\Services\ComprobanteService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;
use Tests\CreatesTenant;
use Tests\TestCase;

class ComprobanteControllerTest extends TestCase
{
    use CreatesTenant, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();
    }

    public function test_index_requires_pagos_ver_permission(): void
    {
        $role = Role::firstOrCreate(['name' => 'Recepcionista', 'guard_name' => 'web']);
        $this->user->syncRoles($role);

        $this->getJson('/api/comprobantes', $this->authHeaders())
            ->assertForbidden();
    }

    public function test_index_lists_comprobantes(): void
    {
        Queue::fake();

        $this->tenant->update([
            'ruc' => '20123456789',
            'sunat_serie_boleta' => 'B001',
            'sunat_correlative_boleta' => 0,
        ]);

        $comprobante = $this->createComprobante();

        $this->getJson('/api/comprobantes', $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('data.0.id', $comprobante->id)
            ->assertJsonPath('data.0.serie', 'B001')
            ->assertJsonPath('data.0.correlativo', 1)
            ->assertJsonPath('data.0.tipo_doc', Comprobante::TIPO_BOLETA);
    }

    public function test_store_creates_factura_with_receptor(): void
    {
        Queue::fake();

        $this->tenant->update([
            'ruc' => '20123456789',
            'sunat_serie_factura' => 'F001',
            'sunat_correlative_factura' => 0,
        ]);

        $payment = $this->createPayment();

        $this->postJson('/api/comprobantes', [
            'payment_id' => $payment->id,
            'tipo_doc' => Comprobante::TIPO_FACTURA,
            'doc_number' => '20100047218',
            'name' => 'Empresa SAC',
            'address' => 'Av. Lima 123',
        ], $this->authHeaders())
            ->assertCreated()
            ->assertJsonPath('serie', 'F001')
            ->assertJsonPath('correlativo', 1)
            ->assertJsonPath('doc_type', '6')
            ->assertJsonPath('doc_number', '20100047218')
            ->assertJsonPath('name', 'Empresa SAC');

        Queue::assertPushed(SendComprobante::class);
    }

    public function test_store_requires_ruc_and_name_for_factura(): void
    {
        Queue::fake();

        $payment = $this->createPayment();

        $this->postJson('/api/comprobantes', [
            'payment_id' => $payment->id,
            'tipo_doc' => Comprobante::TIPO_FACTURA,
        ], $this->authHeaders())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Para emitir una Factura se requiere RUC y Razón Social.');

        Queue::assertNothingPushed();
    }

    public function test_store_rejects_invalid_tipo_doc(): void
    {
        $payment = $this->createPayment();

        $this->postJson('/api/comprobantes', [
            'payment_id' => $payment->id,
            'tipo_doc' => '07',
        ], $this->authHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors('tipo_doc');
    }

    public function test_store_creates_boleta_by_default(): void
    {
        Queue::fake();

        $this->tenant->update([
            'sunat_serie_boleta' => 'B001',
            'sunat_correlative_boleta' => 0,
        ]);

        $payment = $this->createPayment();

        $this->postJson('/api/comprobantes', [
            'payment_id' => $payment->id,
            'tipo_doc' => Comprobante::TIPO_BOLETA,
        ], $this->authHeaders())
            ->assertCreated()
            ->assertJsonPath('serie', 'B001')
            ->assertJsonPath('doc_type', '1');
    }

    public function test_resend_only_for_rejected_or_error(): void
    {
        Queue::fake();

        $comprobante = $this->createComprobante();
        $comprobante->update(['estado' => Comprobante::ESTADO_ACEPTADO]);

        Queue::fake();

        $this->postJson('/api/comprobantes/'.$comprobante->id.'/resend', [], $this->authHeaders())
            ->assertStatus(422);

        Queue::assertNothingPushed();
    }

    public function test_resend_requeues_for_rejected(): void
    {
        Queue::fake();

        $comprobante = $this->createComprobante();
        $comprobante->update(['estado' => Comprobante::ESTADO_RECHAZADO]);

        $this->postJson('/api/comprobantes/'.$comprobante->id.'/resend', [], $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('message', 'Comprobante reencolado para envío.');

        Queue::assertPushed(SendComprobante::class);
    }

    public function test_download_xml_returns_404_when_missing(): void
    {
        Queue::fake();

        $comprobante = $this->createComprobante();

        $this->getJson('/api/comprobantes/'.$comprobante->id.'/xml', $this->authHeaders())
            ->assertStatus(404);
    }

    public function test_download_cdr_returns_404_when_missing(): void
    {
        Queue::fake();

        $comprobante = $this->createComprobante();

        $this->getJson('/api/comprobantes/'.$comprobante->id.'/cdr', $this->authHeaders())
            ->assertStatus(404);
    }

    public function test_payment_store_auto_emits_boleta_when_sunat_enabled(): void
    {
        Queue::fake();

        $this->tenant->update([
            'ruc' => '20123456789',
            'sunat_enabled' => true,
            'sunat_serie_boleta' => 'B001',
            'sunat_correlative_boleta' => 0,
        ]);

        $patient = Patient::factory()->create(['tenant_id' => $this->tenant->id, 'dni' => '12345678']);
        $treatment = Treatment::factory()->create(['tenant_id' => $this->tenant->id, 'name' => 'Tratamiento '.uniqid()]);
        $budget = Budget::factory()->create(['tenant_id' => $this->tenant->id, 'patient_id' => $patient->id, 'total' => 118.00, 'discount_amount' => 0, 'grand_total' => 118.00]);
        BudgetItem::factory()->create(['tenant_id' => $this->tenant->id, 'budget_id' => $budget->id, 'treatment_id' => $treatment->id, 'description' => 'Consulta', 'quantity' => 1, 'unit_price' => 118.00, 'subtotal' => 118.00]);

        $this->postJson('/api/payments', [
            'patient_id' => $patient->id,
            'budget_id' => $budget->id,
            'amount' => 118.00,
            'payment_date' => '2026-07-31',
            'method' => 'cash',
        ], $this->authHeaders())
            ->assertCreated()
            ->assertJsonPath('comprobante.serie', 'B001')
            ->assertJsonPath('comprobante.tipo_doc', Comprobante::TIPO_BOLETA);

        $this->assertDatabaseHas('comprobantes', ['serie' => 'B001', 'correlativo' => 1]);
        Queue::assertPushed(SendComprobante::class);
    }

    public function test_budget_balance_returns_patient_id(): void
    {
        $patient = Patient::factory()->create(['tenant_id' => $this->tenant->id, 'dni' => '12345678']);
        $treatment = Treatment::factory()->create(['tenant_id' => $this->tenant->id, 'name' => 'Tratamiento '.uniqid()]);
        $budget = Budget::factory()->create(['tenant_id' => $this->tenant->id, 'patient_id' => $patient->id, 'total' => 118.00, 'discount_amount' => 0, 'grand_total' => 118.00]);
        BudgetItem::factory()->create(['tenant_id' => $this->tenant->id, 'budget_id' => $budget->id, 'treatment_id' => $treatment->id, 'description' => 'Consulta', 'quantity' => 1, 'unit_price' => 118.00, 'subtotal' => 118.00]);

        $response = $this->getJson('/api/budgets/'.$budget->id.'/balance', $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('patient_id', $patient->id);

        $this->assertEquals(118, (float) $response->json('grand_total'));
        $this->assertEquals(118, (float) $response->json('balance'));
    }

    public function test_payment_store_does_not_emit_when_sunat_disabled(): void
    {
        Queue::fake();

        $this->tenant->update([
            'ruc' => '20123456789',
            'sunat_enabled' => false,
        ]);

        $patient = Patient::factory()->create(['tenant_id' => $this->tenant->id, 'dni' => '12345678']);
        $treatment = Treatment::factory()->create(['tenant_id' => $this->tenant->id, 'name' => 'Tratamiento '.uniqid()]);
        $budget = Budget::factory()->create(['tenant_id' => $this->tenant->id, 'patient_id' => $patient->id, 'total' => 118.00, 'discount_amount' => 0, 'grand_total' => 118.00]);
        BudgetItem::factory()->create(['tenant_id' => $this->tenant->id, 'budget_id' => $budget->id, 'treatment_id' => $treatment->id, 'description' => 'Consulta', 'quantity' => 1, 'unit_price' => 118.00, 'subtotal' => 118.00]);

        $this->postJson('/api/payments', [
            'patient_id' => $patient->id,
            'budget_id' => $budget->id,
            'amount' => 118.00,
            'payment_date' => '2026-07-31',
            'method' => 'cash',
        ], $this->authHeaders())
            ->assertCreated()
            ->assertJsonPath('comprobante', null);

        $this->assertDatabaseCount('comprobantes', 0);
        Queue::assertNothingPushed();
    }

    public function test_payment_store_without_budget_does_not_emit(): void
    {
        Queue::fake();

        $this->tenant->update([
            'ruc' => '20123456789',
            'sunat_enabled' => true,
        ]);

        $patient = Patient::factory()->create(['tenant_id' => $this->tenant->id, 'dni' => '12345678']);

        $this->postJson('/api/payments', [
            'patient_id' => $patient->id,
            'amount' => 50.00,
            'payment_date' => '2026-07-31',
            'method' => 'cash',
        ], $this->authHeaders())
            ->assertCreated();

        $this->assertDatabaseCount('comprobantes', 0);
        Queue::assertNothingPushed();
    }

    public function test_pdf_returns_pdf_document(): void
    {
        Queue::fake();

        $this->tenant->update([
            'ruc' => '20123456789',
            'name' => 'DentalClinic SAC',
            'sunat_serie_boleta' => 'B001',
        ]);

        $comprobante = $this->createComprobante();

        $this->get('/api/pdf/comprobantes/'.$comprobante->id, $this->authHeaders())
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    private function createPayment(): Payment
    {
        $patient = Patient::factory()->create([
            'tenant_id' => $this->tenant->id,
            'dni' => '12345678',
            'first_name' => 'Ana',
            'first_last_name' => 'Perez',
        ]);
        $treatment = Treatment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Tratamiento '.uniqid(),
        ]);
        $budget = Budget::factory()->create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'total' => 118.00,
            'discount_amount' => 0,
            'grand_total' => 118.00,
        ]);
        BudgetItem::factory()->create([
            'tenant_id' => $this->tenant->id,
            'budget_id' => $budget->id,
            'treatment_id' => $treatment->id,
            'description' => 'Consulta',
            'quantity' => 1,
            'unit_price' => 118.00,
            'subtotal' => 118.00,
        ]);

        return Payment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'budget_id' => $budget->id,
            'patient_id' => $patient->id,
            'amount' => 118.00,
            'method' => 'cash',
        ]);
    }

    private function createComprobante(): Comprobante
    {
        $payment = $this->createPayment();

        return app(ComprobanteService::class)->createFromPayment($payment, Comprobante::TIPO_BOLETA);
    }
}
