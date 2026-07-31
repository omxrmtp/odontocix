<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Greenter\Model\Client\Client;
use Greenter\Model\Company\Address;
use Greenter\Model\Company\Company;
use Greenter\Model\Sale\FormaPagos\FormaPagoContado;
use Greenter\Model\Sale\Invoice;
use Greenter\Model\Sale\SaleDetail;
use Greenter\See;
use Greenter\Ws\Services\SunatEndpoints;
use Greenter\XMLSecLibs\Certificate\X509Certificate;
use Greenter\XMLSecLibs\Certificate\X509ContentType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SunatSettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        return response()->json([
            'ruc' => $tenant->ruc,
            'enabled' => $tenant->sunat_enabled,
            'environment' => $tenant->sunat_environment ?? 'beta',
            'serie_boleta' => $tenant->sunat_serie_boleta ?? 'B001',
            'serie_factura' => $tenant->sunat_serie_factura ?? 'F001',
            'correlative_boleta' => $tenant->sunat_correlative_boleta ?? 0,
            'correlative_factura' => $tenant->sunat_correlative_factura ?? 0,
            'has_certificate' => ! empty($tenant->sunat_certificate),
            'certificate_name' => $tenant->sunat_certificate_name,
            'has_certificate_password' => ! empty($tenant->sunat_certificate_password),
            'has_sol_user' => ! empty($tenant->sunat_sol_user),
            'has_sol_password' => ! empty($tenant->sunat_sol_password),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        $data = $request->validate([
            'enabled' => 'nullable|boolean',
            'environment' => 'nullable|in:beta,produccion',
            'certificate' => 'nullable|string',
            'certificate_password' => 'nullable|string',
            'certificate_name' => 'nullable|string|max:255',
            'sol_user' => 'nullable|string|max:255',
            'sol_password' => 'nullable|string',
            'serie_boleta' => 'nullable|string|max:4',
            'serie_factura' => 'nullable|string|max:4',
        ]);

        $fields = [
            'sunat_environment' => $data['environment'] ?? null,
            'sunat_certificate' => $data['certificate'] ?? null,
            'sunat_certificate_password' => $data['certificate_password'] ?? null,
            'sunat_certificate_name' => $data['certificate_name'] ?? null,
            'sunat_sol_user' => $data['sol_user'] ?? null,
            'sunat_sol_password' => $data['sol_password'] ?? null,
            'sunat_serie_boleta' => $data['serie_boleta'] ?? null,
            'sunat_serie_factura' => $data['serie_factura'] ?? null,
        ];

        // Campos vacíos conservan el valor existente
        foreach ($fields as $column => $value) {
            if ($value === null || $value === '') {
                unset($fields[$column]);
            }
        }

        if (array_key_exists('enabled', $data)) {
            $fields['sunat_enabled'] = $data['enabled'];
        }

        if (array_key_exists('sunat_certificate', $fields) && ! $fields['sunat_certificate']) {
            unset($fields['sunat_certificate']);
        }

        $tenant->update($fields);

        return response()->json([
            'message' => 'Configuración de facturación SUNAT guardada correctamente.',
        ]);
    }

    public function test(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        if (empty($tenant->sunat_certificate)) {
            return response()->json([
                'message' => 'Primero sube el certificado digital (.pfx) para poder probar la conexión.',
            ], 422);
        }

        if (empty($tenant->sunat_certificate_password)) {
            return response()->json([
                'message' => 'La contraseña del certificado es requerida para probar la conexión.',
            ], 422);
        }

        try {
            $certificate = new X509Certificate($tenant->sunat_certificate, $tenant->sunat_certificate_password);

            $see = new See;
            $see->setCertificate($certificate->export(X509ContentType::PEM));
            $see->setService($this->endpointFor($tenant->sunat_environment));

            if (! empty($tenant->sunat_sol_user) && ! empty($tenant->sunat_sol_password)) {
                $see->setClaveSOL($tenant->ruc, $tenant->sunat_sol_user, $tenant->sunat_sol_password);
            }

            $xml = $see->getXmlSigned($this->dummyInvoice($tenant));

            if (empty($xml)) {
                throw new \RuntimeException('No se pudo generar el XML firmado.');
            }

            return response()->json([
                'message' => 'Conexión correcta: certificado válido y firma digital generada.',
                'certificate' => [
                    'name' => $certificate->getName(),
                    'valid_from' => $certificate->getValidFrom()?->format('Y-m-d'),
                    'expires_at' => $certificate->getExpiration()?->format('Y-m-d'),
                    'issuer' => $certificate->getIssuer()['CN'] ?? null,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('SUNAT test connection failed', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Error de conexión: '.$e->getMessage(),
            ], 422);
        }
    }

    private function endpointFor(?string $environment): string
    {
        return $environment === 'produccion'
            ? SunatEndpoints::FE_PRODUCCION
            : SunatEndpoints::FE_BETA;
    }

    private function dummyInvoice($tenant): Invoice
    {
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
            ->setTipoDoc('6')
            ->setNumDoc('20000000001')
            ->setRznSocial('EMPRESA DE PRUEBA');

        $item = (new SaleDetail)
            ->setCodProducto('T001')
            ->setUnidad('NIU')
            ->setCantidad(1)
            ->setMtoValorUnitario(10.00)
            ->setDescripcion('COMPROBANTE DE PRUEBA')
            ->setMtoBaseIgv(10.00)
            ->setPorcentajeIgv(18.00)
            ->setIgv(1.80)
            ->setTipAfeIgv('10')
            ->setTotalImpuestos(1.80)
            ->setMtoValorVenta(10.00)
            ->setMtoPrecioUnitario(11.80);

        return (new Invoice)
            ->setUblVersion('2.1')
            ->setTipoOperacion('0101')
            ->setTipoDoc('01')
            ->setSerie('F001')
            ->setCorrelativo('1')
            ->setFechaEmision(new \DateTime('now', new \DateTimeZone('America/Lima')))
            ->setFormaPago(new FormaPagoContado)
            ->setTipoMoneda('PEN')
            ->setCompany($company)
            ->setClient($client)
            ->setMtoOperGravadas(10.00)
            ->setMtoIGV(1.80)
            ->setTotalImpuestos(1.80)
            ->setValorVenta(10.00)
            ->setSubTotal(11.80)
            ->setMtoImpVenta(11.80)
            ->setDetails([$item]);
    }
}
