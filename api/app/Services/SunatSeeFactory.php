<?php

namespace App\Services;

use App\Models\Tenant;
use Greenter\See;
use Greenter\Ws\Services\SunatEndpoints;
use Greenter\XMLSecLibs\Certificate\X509Certificate;
use Greenter\XMLSecLibs\Certificate\X509ContentType;

class SunatSeeFactory
{
    public function __construct(private SunatConfigResolver $configResolver) {}

    public function forTenant(?Tenant $tenant = null): See
    {
        $tenant = $tenant ?? $this->configResolver->tenant();

        $see = new See;

        if (! empty($tenant->sunat_certificate)) {
            $certificate = new X509Certificate($tenant->sunat_certificate, $tenant->sunat_certificate_password ?? '');
            $see->setCertificate($certificate->export(X509ContentType::PEM));
        }

        $see->setService($this->endpointFor($tenant->sunat_environment ?? 'beta'));

        if (! empty($tenant->sunat_sol_user) && ! empty($tenant->sunat_sol_password)) {
            $see->setClaveSOL($tenant->ruc, $tenant->sunat_sol_user, $tenant->sunat_sol_password);
        }

        return $see;
    }

    public function endpointFor(?string $environment): string
    {
        return $environment === 'produccion'
            ? SunatEndpoints::FE_PRODUCCION
            : SunatEndpoints::FE_BETA;
    }
}
