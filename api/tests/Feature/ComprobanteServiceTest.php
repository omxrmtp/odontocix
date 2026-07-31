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
use App\Services\SunatConfigResolver;
use App\Services\SunatSeeFactory;
use Greenter\Factory\FeFactory;
use Greenter\Model\Response\BillResult;
use Greenter\Model\Response\CdrResponse;
use Greenter\Model\Response\Error;
use Greenter\See;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\CreatesTenant;
use Tests\TestCase;

class ComprobanteServiceTest extends TestCase
{
    use CreatesTenant, RefreshDatabase;

    protected ComprobanteService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();
        $this->service = app(ComprobanteService::class);
    }

    public function test_allocate_serie_increments_boleta_correlative(): void
    {
        $this->tenant->update([
            'ruc' => '20123456789',
            'sunat_serie_boleta' => 'B001',
            'sunat_correlative_boleta' => 4,
        ]);

        [$serie, $correlativo] = $this->service->allocateSerie($this->tenant, Comprobante::TIPO_BOLETA);

        $this->assertSame('B001', $serie);
        $this->assertSame(5, $correlativo);
        $this->assertSame(5, $this->tenant->fresh()->sunat_correlative_boleta);
    }

    public function test_allocate_serie_increments_factura_correlative(): void
    {
        $this->tenant->update([
            'sunat_serie_factura' => 'F001',
            'sunat_correlative_factura' => 2,
        ]);

        [$serie, $correlativo] = $this->service->allocateSerie($this->tenant, Comprobante::TIPO_FACTURA);

        $this->assertSame('F001', $serie);
        $this->assertSame(3, $correlativo);
        $this->assertSame(3, $this->tenant->fresh()->sunat_correlative_factura);
    }

    public function test_create_from_payment_creates_boleta_with_correct_amounts(): void
    {
        Queue::fake();

        $this->tenant->update([
            'ruc' => '20123456789',
            'sunat_serie_boleta' => 'B001',
            'sunat_correlative_boleta' => 0,
        ]);

        $patient = $this->createPatient('12345678', 'Ana', 'Perez');
        $budget = $this->createBudget($patient, [
            ['description' => 'Limpieza dental', 'quantity' => 2, 'unit_price' => 118.00],
        ], 236.00, 0, 236.00);
        $payment = $this->createPayment($patient, $budget, 236.00);

        $comprobante = $this->service->createFromPayment($payment, Comprobante::TIPO_BOLETA);

        $this->assertInstanceOf(Comprobante::class, $comprobante);
        $this->assertSame('B001', $comprobante->serie);
        $this->assertSame(1, $comprobante->correlativo);
        $this->assertSame(Comprobante::TIPO_BOLETA, $comprobante->tipo_doc);
        $this->assertSame('1', $comprobante->doc_type);
        $this->assertSame('12345678', $comprobante->doc_number);
        $this->assertSame('Ana Perez', $comprobante->name);
        $this->assertSame(Comprobante::ESTADO_PENDIENTE, $comprobante->estado);

        $this->assertSame('200.00', (string) $comprobante->mto_oper_gravadas);
        $this->assertSame('36.00', (string) $comprobante->mto_igv);
        $this->assertSame('36.00', (string) $comprobante->total_impuestos);
        $this->assertSame('200.00', (string) $comprobante->valor_venta);
        $this->assertSame('236.00', (string) $comprobante->mto_imp_venta);

        Queue::assertPushed(SendComprobante::class);
    }

    public function test_create_from_payment_with_discount_applies_allowance(): void
    {
        Queue::fake();

        $this->tenant->update([
            'sunat_serie_boleta' => 'B001',
            'sunat_correlative_boleta' => 0,
        ]);

        $patient = $this->createPatient('12345678');
        $budget = $this->createBudget($patient, [
            ['description' => 'Ortodoncia', 'quantity' => 1, 'unit_price' => 118.00],
        ], 118.00, 11.80, 106.20);
        $payment = $this->createPayment($patient, $budget, 106.20);

        $comprobante = $this->service->createFromPayment($payment);

        $this->assertSame('90.00', (string) $comprobante->mto_oper_gravadas);
        $this->assertSame('16.20', (string) $comprobante->mto_igv);
        $this->assertSame('106.20', (string) $comprobante->mto_imp_venta);

        $invoice = $this->service->buildInvoice($comprobante);
        $this->assertSame(10.0, $invoice->getSumDsctoGlobal());
        $this->assertSame(90.0, $invoice->getMtoOperGravadas());
    }

    public function test_create_from_payment_factura_uses_ruc_receptor(): void
    {
        Queue::fake();

        $this->tenant->update([
            'sunat_serie_factura' => 'F001',
            'sunat_correlative_factura' => 0,
        ]);

        $patient = $this->createPatient('12345678', 'Carlos', 'Ruiz');
        $budget = $this->createBudget($patient, [
            ['description' => 'Radiografía', 'quantity' => 1, 'unit_price' => 118.00],
        ], 118.00, 0, 118.00);
        $payment = $this->createPayment($patient, $budget, 118.00);

        $comprobante = $this->service->createFromPayment($payment, Comprobante::TIPO_FACTURA, [
            'doc_number' => '20100047218',
            'name' => 'Empresa SAC',
            'address' => 'Av. Lima 123',
        ]);

        $this->assertSame('F001', $comprobante->serie);
        $this->assertSame('6', $comprobante->doc_type);
        $this->assertSame('20100047218', $comprobante->doc_number);
        $this->assertSame('Empresa SAC', $comprobante->name);
        $this->assertSame('Av. Lima 123', $comprobante->address);
    }

    public function test_build_invoice_maps_company_and_client(): void
    {
        Queue::fake();

        $this->tenant->update([
            'ruc' => '20123456789',
            'name' => 'DentalClinic SAC',
            'address' => 'Av. Principal 456',
            'sunat_serie_boleta' => 'B001',
        ]);

        $patient = $this->createPatient('12345678');
        $budget = $this->createBudget($patient, [
            ['description' => 'Consulta', 'quantity' => 1, 'unit_price' => 59.00],
        ], 59.00, 0, 59.00);
        $payment = $this->createPayment($patient, $budget, 59.00);

        $comprobante = $this->service->createFromPayment($payment);
        $invoice = $this->service->buildInvoice($comprobante);

        $this->assertSame('2.1', $invoice->getUblVersion());
        $this->assertSame('0101', $invoice->getTipoOperacion());
        $this->assertSame(Comprobante::TIPO_BOLETA, $invoice->getTipoDoc());
        $this->assertSame('B001', $invoice->getSerie());
        $this->assertSame('1', $invoice->getCorrelativo());
        $this->assertSame('PEN', $invoice->getTipoMoneda());
        $this->assertSame('20123456789', $invoice->getCompany()->getRuc());
        $this->assertSame('12345678', $invoice->getClient()->getNumDoc());
        $this->assertSame('1', $invoice->getClient()->getTipoDoc());
        $this->assertSame('18', (string) $invoice->getDetails()[0]->getPorcentajeIgv());
        $this->assertSame('10', $invoice->getDetails()[0]->getTipAfeIgv());
        $this->assertSame(50.0, $invoice->getDetails()[0]->getMtoValorUnitario());
        $this->assertSame(59.0, $invoice->getDetails()[0]->getMtoPrecioUnitario());
        $this->assertSame('20123456789-03-B001-1', $invoice->getName());
    }

    public function test_send_marks_as_accepted(): void
    {
        Queue::fake();

        $this->tenant->update([
            'ruc' => '20123456789',
            'sunat_serie_boleta' => 'B001',
        ]);

        $patient = $this->createPatient('12345678');
        $budget = $this->createBudget($patient, [
            ['description' => 'Consulta', 'quantity' => 1, 'unit_price' => 59.00],
        ], 59.00, 0, 59.00);
        $payment = $this->createPayment($patient, $budget, 59.00);

        $comprobante = $this->service->createFromPayment($payment);

        $cdr = new CdrResponse;
        $cdr->setCode('0')->setDescription('La Factura numero F001-1, ha sido aceptada')->setNotes([]);

        $billResult = new BillResult;
        $billResult->setSuccess(true)
            ->setCdrResponse($cdr)
            ->setCdrZip('zip-content');

        [$service, $seeMock] = $this->mockSendService($billResult);
        $service->send($comprobante->refresh());

        $comprobante->refresh();
        $this->assertSame(Comprobante::ESTADO_ACEPTADO, $comprobante->estado);
        $this->assertSame('0', $comprobante->cdr_code);
        $this->assertNotNull($comprobante->cdr_at);
        $this->assertStringEndsWith('.xml', $comprobante->xml_path);
        $this->assertStringEndsWith('.zip', $comprobante->cdr_zip_path);
        $this->assertSame(hash('sha256', '20123456789-03-B001-1'), $comprobante->hash);
    }

    public function test_send_marks_as_accepted_with_observations(): void
    {
        Queue::fake();

        $this->tenant->update([
            'ruc' => '20123456789',
            'sunat_serie_boleta' => 'B001',
        ]);

        $patient = $this->createPatient('12345678');
        $budget = $this->createBudget($patient, [
            ['description' => 'Consulta', 'quantity' => 1, 'unit_price' => 59.00],
        ], 59.00, 0, 59.00);
        $payment = $this->createPayment($patient, $budget, 59.00);

        $comprobante = $this->service->createFromPayment($payment);

        $cdr = new CdrResponse;
        $cdr->setCode('0')->setDescription('aceptada')->setNotes(['Observación 1']);

        $billResult = new BillResult;
        $billResult->setSuccess(true)->setCdrResponse($cdr);

        [$service] = $this->mockSendService($billResult);
        $service->send($comprobante->refresh());

        $comprobante->refresh();
        $this->assertSame(Comprobante::ESTADO_ACEPTADO_OBSERVACIONES, $comprobante->estado);
        $this->assertSame(['Observación 1'], $comprobante->cdr_notes);
    }

    public function test_send_marks_as_rejected_for_error_code(): void
    {
        Queue::fake();

        $this->tenant->update([
            'ruc' => '20123456789',
            'sunat_serie_boleta' => 'B001',
        ]);

        $patient = $this->createPatient('12345678');
        $budget = $this->createBudget($patient, [
            ['description' => 'Consulta', 'quantity' => 1, 'unit_price' => 59.00],
        ], 59.00, 0, 59.00);
        $payment = $this->createPayment($patient, $budget, 59.00);

        $comprobante = $this->service->createFromPayment($payment);

        $cdr = new CdrResponse;
        $cdr->setCode('2335')->setDescription('La boleta no se encontró')->setNotes([]);

        $billResult = new BillResult;
        $billResult->setSuccess(true)->setCdrResponse($cdr);

        [$service] = $this->mockSendService($billResult);
        $service->send($comprobante->refresh());

        $comprobante->refresh();
        $this->assertSame(Comprobante::ESTADO_RECHAZADO, $comprobante->estado);
        $this->assertSame('2335', $comprobante->cdr_code);
    }

    public function test_send_marks_as_error_when_unsuccessful(): void
    {
        Queue::fake();

        $this->tenant->update([
            'ruc' => '20123456789',
            'sunat_serie_boleta' => 'B001',
        ]);

        $patient = $this->createPatient('12345678');
        $budget = $this->createBudget($patient, [
            ['description' => 'Consulta', 'quantity' => 1, 'unit_price' => 59.00],
        ], 59.00, 0, 59.00);
        $payment = $this->createPayment($patient, $budget, 59.00);

        $comprobante = $this->service->createFromPayment($payment);

        $billResult = new BillResult;
        $billResult->setSuccess(false)->setError(new Error('98', 'Firma no válida'));

        [$service] = $this->mockSendService($billResult);
        $service->send($comprobante->refresh());

        $comprobante->refresh();
        $this->assertSame(Comprobante::ESTADO_ERROR, $comprobante->estado);
        $this->assertSame('98', $comprobante->error_code);
        $this->assertSame('Firma no válida', $comprobante->error_message);
    }

    private function createPatient(string $dni, string $firstName = 'Ana', string $lastName = 'Perez'): Patient
    {
        return Patient::create([
            'tenant_id' => $this->tenant->id,
            'dni' => $dni,
            'first_name' => $firstName,
            'first_last_name' => $lastName,
            'gender' => 'F',
        ]);
    }

    private function createBudget(Patient $patient, array $itemsData, float $total, float $discount, float $grandTotal): Budget
    {
        $budget = Budget::create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'total' => $total,
            'discount_amount' => $discount,
            'discount_percent' => $discount > 0 ? round(($discount / $total) * 100, 2) : 0,
            'grand_total' => $grandTotal,
            'status' => 'approved',
        ]);

        foreach ($itemsData as $index => $item) {
            BudgetItem::create([
                'tenant_id' => $this->tenant->id,
                'budget_id' => $budget->id,
                'treatment_id' => Treatment::create([
                    'tenant_id' => $this->tenant->id,
                    'name' => 'Tratamiento '.$this->tenant->id.'-'.$index,
                    'description' => $item['description'],
                    'base_price' => $item['unit_price'],
                ])->id,
                'description' => $item['description'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'subtotal' => $item['quantity'] * $item['unit_price'],
            ]);
        }

        return $budget;
    }

    private function createPayment(Patient $patient, Budget $budget, float $amount): Payment
    {
        return Payment::create([
            'tenant_id' => $this->tenant->id,
            'budget_id' => $budget->id,
            'patient_id' => $patient->id,
            'amount' => $amount,
            'payment_date' => '2026-07-31',
            'method' => 'cash',
        ]);
    }

    /**
     * @return array{0: ComprobanteService, 1: See}
     */
    private function mockSendService(BillResult $billResult): array
    {
        $factoryMock = Mockery::mock(FeFactory::class);
        $factoryMock->shouldReceive('getLastXml')->once()->andReturn('<Invoice/>');

        $seeMock = Mockery::mock(See::class);
        $seeMock->shouldReceive('send')->once()->andReturn($billResult);
        $seeMock->shouldReceive('getFactory')->once()->andReturn($factoryMock);

        $factoryService = Mockery::mock(SunatSeeFactory::class);
        $factoryService->shouldReceive('forTenant')->once()->andReturn($seeMock);

        $service = new ComprobanteService(app(SunatConfigResolver::class), $factoryService);

        return [$service, $seeMock];
    }
}
