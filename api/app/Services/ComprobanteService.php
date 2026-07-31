<?php

namespace App\Services;

use App\Jobs\SendComprobante;
use App\Models\Comprobante;
use App\Models\Payment;
use App\Models\Tenant;
use Carbon\CarbonImmutable;
use Greenter\Model\Client\Client;
use Greenter\Model\Company\Address;
use Greenter\Model\Company\Company;
use Greenter\Model\Sale\Charge;
use Greenter\Model\Sale\FormaPagos\FormaPagoContado;
use Greenter\Model\Sale\Invoice;
use Greenter\Model\Sale\Legend;
use Greenter\Model\Sale\SaleDetail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ComprobanteService
{
    public const IGV_RATE = 0.18;

    public function __construct(
        private SunatConfigResolver $configResolver,
        private SunatSeeFactory $seeFactory,
    ) {}

    /**
     * Asigna serie y correlativo de forma atómica por tenant.
     *
     * @return array{serie: string, correlativo: int}
     */
    public function allocateSerie(Tenant $tenant, string $tipoDoc): array
    {
        $column = $tipoDoc === Comprobante::TIPO_FACTURA
            ? 'sunat_correlative_factura'
            : 'sunat_correlative_boleta';
        $serieColumn = $tipoDoc === Comprobante::TIPO_FACTURA
            ? 'sunat_serie_factura'
            : 'sunat_serie_boleta';

        return DB::transaction(function () use ($tenant, $column, $serieColumn, $tipoDoc) {
            $locked = Tenant::where('id', $tenant->id)->lockForUpdate()->firstOrFail();
            $serie = $locked->{$serieColumn} ?? ($tipoDoc === Comprobante::TIPO_FACTURA ? 'F001' : 'B001');
            $correlativo = (int) ($locked->{$column} ?? 0) + 1;

            $locked->update([$column => $correlativo]);

            return [$serie, $correlativo];
        });
    }

    /**
     * Crea un comprobante a partir de un pago y lo encola para envío.
     */
    public function createFromPayment(Payment $payment, string $tipoDoc = Comprobante::TIPO_BOLETA, array $receptor = []): Comprobante
    {
        $tenant = Tenant::find($payment->tenant_id);

        [$serie, $correlativo] = $this->allocateSerie($tenant, $tipoDoc);

        $receptor = $this->buildReceptor($payment, $tipoDoc, $receptor);
        [$amounts, $details] = $this->computeAmounts($payment, $tipoDoc);

        $comprobante = Comprobante::create([
            'tenant_id' => $payment->tenant_id,
            'tipo_doc' => $tipoDoc,
            'serie' => $serie,
            'correlativo' => $correlativo,
            'budget_id' => $payment->budget_id,
            'payment_id' => $payment->id,
            'patient_id' => $payment->patient_id,
            'doc_type' => $receptor['doc_type'],
            'doc_number' => $receptor['doc_number'],
            'name' => $receptor['name'],
            'address' => $receptor['address'],
            'mto_oper_gravadas' => $amounts['mto_oper_gravadas'],
            'mto_igv' => $amounts['mto_igv'],
            'total_impuestos' => $amounts['total_impuestos'],
            'valor_venta' => $amounts['valor_venta'],
            'subtotal' => $amounts['subtotal'],
            'mto_imp_venta' => $amounts['mto_imp_venta'],
            'estado' => Comprobante::ESTADO_PENDIENTE,
        ]);

        SendComprobante::dispatch($comprobante->id);

        return $comprobante;
    }

    /**
     * Construye el Invoice de greenter listo para firmar y enviar.
     */
    public function buildInvoice(Comprobante $comprobante): Invoice
    {
        $tenant = Tenant::find($comprobante->tenant_id);
        $payment = $comprobante->payment;
        $budget = $comprobante->budget;

        $address = (new Address)
            ->setUbigueo('150101')
            ->setDepartamento('LIMA')
            ->setProvincia('LIMA')
            ->setDistrito('LIMA')
            ->setUrbanizacion('-')
            ->setDireccion($tenant->address ?: '-')
            ->setCodLocal('0000');

        $company = (new Company)
            ->setRuc($tenant->ruc)
            ->setRazonSocial($tenant->name)
            ->setNombreComercial($tenant->name)
            ->setAddress($address);

        $client = (new Client)
            ->setTipoDoc($comprobante->doc_type ?? '1')
            ->setNumDoc($comprobante->doc_number ?? '')
            ->setRznSocial($comprobante->name ?? '-');

        [$amounts, $details] = $this->computeAmounts($payment, $comprobante->tipo_doc);

        $invoice = (new Invoice)
            ->setUblVersion('2.1')
            ->setTipoOperacion('0101')
            ->setTipoDoc($comprobante->tipo_doc)
            ->setSerie($comprobante->serie)
            ->setCorrelativo((string) $comprobante->correlativo)
            ->setFechaEmision(CarbonImmutable::now('America/Lima'))
            ->setFormaPago(new FormaPagoContado)
            ->setTipoMoneda('PEN')
            ->setCompany($company)
            ->setClient($client)
            ->setMtoOperGravadas($amounts['mto_oper_gravadas'])
            ->setMtoIGV($amounts['mto_igv'])
            ->setTotalImpuestos($amounts['total_impuestos'])
            ->setValorVenta($amounts['valor_venta'])
            ->setSubTotal($amounts['subtotal'])
            ->setMtoImpVenta($amounts['mto_imp_venta'])
            ->setDetails($details);

        if (! empty($amounts['descuento'])) {
            $invoice->setSumDsctoGlobal($amounts['descuento'])
                ->setMtoDescuentos($amounts['descuento'])
                ->setDescuentos([
                    (new Charge)
                        ->setCodTipo('01')
                        ->setMontoBase($amounts['valor_venta'])
                        ->setFactor(1)
                        ->setMonto($amounts['descuento']),
                ]);
        }

        $invoice->setLegends([
            (new Legend)
                ->setCode('1000')
                ->setValue('SON '.strtoupper($this->numberToWords((int) $amounts['mto_imp_venta'])).' SOLES'),
        ]);

        return $invoice;
    }

    public function send(Comprobante $comprobante): void
    {
        $see = $this->seeFactory->forTenant(Tenant::find($comprobante->tenant_id));
        $invoice = $this->buildInvoice($comprobante);

        $result = $see->send($invoice);

        $name = $invoice->getName();
        $xml = $see->getFactory()->getLastXml();

        $comprobante->update(['hash' => hash('sha256', $name)]);

        if ($xml) {
            $path = 'sunat/'.$comprobante->tenant_id.'/'.$name.'.xml';
            Storage::put($path, $xml);
            $comprobante->update(['xml_path' => $path]);
        }

        if (! $result || ! $result->isSuccess()) {
            $error = $result?->getError();

            $comprobante->update([
                'estado' => Comprobante::ESTADO_ERROR,
                'error_code' => $error?->getCode(),
                'error_message' => $error?->getMessage(),
            ]);

            return;
        }

        $cdr = $result->getCdrResponse();
        $code = (int) $cdr->getCode();

        $cdrZip = $result->getCdrZip();
        if ($cdrZip) {
            $path = 'sunat/'.$comprobante->tenant_id.'/R-'.$name.'.zip';
            Storage::put($path, $cdrZip);
            $comprobante->update(['cdr_zip_path' => $path]);
        }

        $notes = $cdr->getNotes();

        $estado = match (true) {
            $code === 0 && count($notes) > 0 => Comprobante::ESTADO_ACEPTADO_OBSERVACIONES,
            $code === 0 => Comprobante::ESTADO_ACEPTADO,
            $code >= 2000 && $code <= 3999 => Comprobante::ESTADO_RECHAZADO,
            default => Comprobante::ESTADO_ERROR,
        };

        $comprobante->update([
            'estado' => $estado,
            'cdr_code' => (string) $code,
            'cdr_description' => $cdr->getDescription(),
            'cdr_notes' => $notes,
            'cdr_at' => now(),
            'emitted_at' => now(),
        ]);
    }

    private function buildReceptor(Payment $payment, string $tipoDoc, array $receptor): array
    {
        $patientName = trim(trim(($payment->patient?->first_name ?? '').' '.($payment->patient?->second_name ?? ''))
            .' '.trim(($payment->patient?->first_last_name ?? '').' '.($payment->patient?->second_last_name ?? '')));

        if ($tipoDoc === Comprobante::TIPO_FACTURA) {
            return [
                'doc_type' => '6',
                'doc_number' => $receptor['doc_number'] ?? ($payment->patient?->dni ?? ''),
                'name' => $receptor['name'] ?? ($patientName ?: '-'),
                'address' => $receptor['address'] ?? $payment->patient?->address,
            ];
        }

        return [
            'doc_type' => '1',
            'doc_number' => $payment->patient?->dni ?? '',
            'name' => $patientName ?: '-',
            'address' => $payment->patient?->address,
        ];
    }

    /**
     * Calcula montos (precio de venta con IGV incluido) y detalle de líneas.
     *
     * @return array{amounts: array, details: array<SaleDetail>}
     */
    private function computeAmounts(Payment $payment, string $tipoDoc): array
    {
        $items = $payment->budget?->items ?? collect();

        $details = [];
        $lineBaseTotal = 0.0;
        $igvTotal = 0.0;

        if ($items->isEmpty()) {
            $unitPriceWithIgv = (float) $payment->amount;
            $base = round($unitPriceWithIgv / (1 + self::IGV_RATE), 2);
            $igv = round($base * self::IGV_RATE, 2);
            $lineBaseTotal = $base;
            $igvTotal = $igv;

            $details[] = (new SaleDetail)
                ->setCodProducto('P001')
                ->setUnidad('NIU')
                ->setCantidad(1)
                ->setMtoValorUnitario($base)
                ->setDescripcion('PAGO DE '.strtoupper($payment->method))
                ->setMtoBaseIgv($base)
                ->setPorcentajeIgv(self::IGV_RATE * 100)
                ->setIgv($igv)
                ->setTipAfeIgv('10')
                ->setTotalImpuestos($igv)
                ->setMtoValorVenta($base)
                ->setMtoPrecioUnitario($unitPriceWithIgv);

            $amounts = [
                'mto_oper_gravadas' => $lineBaseTotal,
                'mto_igv' => $igvTotal,
                'total_impuestos' => $igvTotal,
                'valor_venta' => $lineBaseTotal,
                'subtotal' => round($lineBaseTotal + $igvTotal, 2),
                'mto_imp_venta' => round($lineBaseTotal + $igvTotal, 2),
                'descuento' => 0.0,
            ];

            return [$amounts, $details];
        }

        $discountAmount = (float) ($payment->budget->discount_amount ?? 0);

        foreach ($items as $index => $item) {
            $quantity = (float) $item->quantity;
            $unitPriceWithIgv = (float) $item->unit_price;
            $base = round(($unitPriceWithIgv / (1 + self::IGV_RATE)), 2);
            $lineBase = round($base * $quantity, 2);
            $igv = round($lineBase * self::IGV_RATE, 2);

            $lineBaseTotal += $lineBase;
            $igvTotal += $igv;

            $details[] = (new SaleDetail)
                ->setCodProducto((string) ($index + 1))
                ->setUnidad('NIU')
                ->setCantidad($quantity)
                ->setMtoValorUnitario($base)
                ->setDescripcion($item->description ?: 'SERVICIO DENTAL')
                ->setMtoBaseIgv($lineBase)
                ->setPorcentajeIgv(self::IGV_RATE * 100)
                ->setIgv($igv)
                ->setTipAfeIgv('10')
                ->setTotalImpuestos($igv)
                ->setMtoValorVenta($lineBase)
                ->setMtoPrecioUnitario($unitPriceWithIgv);
        }

        $discountBase = round($discountAmount / (1 + self::IGV_RATE), 2);
        $lineBaseTotal = round($lineBaseTotal, 2);
        $mtoOperGravadas = round($lineBaseTotal - $discountBase, 2);
        $mtoIgv = round($mtoOperGravadas * self::IGV_RATE, 2);

        $amounts = [
            'mto_oper_gravadas' => $mtoOperGravadas,
            'mto_igv' => $mtoIgv,
            'total_impuestos' => $mtoIgv,
            'valor_venta' => $lineBaseTotal,
            'subtotal' => round($mtoOperGravadas + $mtoIgv, 2),
            'mto_imp_venta' => round($mtoOperGravadas + $mtoIgv, 2),
            'descuento' => $discountBase,
        ];

        return [$amounts, $details];
    }

    private function numberToWords(int $number): string
    {
        $units = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
        $tens = ['', '', 'VEINTI', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
        $hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

        if ($number === 100) {
            return 'CIEN';
        }

        $words = '';
        $hundred = intdiv($number, 100);
        $rest = $number % 100;

        if ($hundred > 0) {
            $words .= $hundreds[$hundred].' ';
        }

        if ($rest <= 20) {
            $words .= $units[$rest];
        } else {
            $ten = intdiv($rest, 10);
            $unit = $rest % 10;
            if ($ten === 2) {
                $words .= 'VEINTI'.($unit > 0 ? $units[$unit] : 'DOS');
            } else {
                $words .= $tens[$ten].($unit > 0 ? ' Y '.$units[$unit] : '');
            }
        }

        return trim($words);
    }
}
