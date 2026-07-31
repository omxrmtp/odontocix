<?php

namespace App\Services;

use App\Models\Tenant;

class SunatConfigResolver
{
    public function __construct(private TenantService $tenantService) {}

    public function tenant(?Tenant $tenant = null): ?Tenant
    {
        return $tenant ?? $this->tenantService->current();
    }

    public function enabled(?Tenant $tenant = null): bool
    {
        return (bool) $this->tenant($tenant)?->sunat_enabled;
    }

    public function config(?Tenant $tenant = null): array
    {
        $tenant = $this->tenant($tenant);

        return [
            'enabled' => $tenant?->sunat_enabled ?? false,
            'environment' => $tenant?->sunat_environment ?? 'beta',
            'serie_boleta' => $tenant?->sunat_serie_boleta ?? 'B001',
            'serie_factura' => $tenant?->sunat_serie_factura ?? 'F001',
            'correlative_boleta' => $tenant?->sunat_correlative_boleta ?? 0,
            'correlative_factura' => $tenant?->sunat_correlative_factura ?? 0,
            'has_certificate' => ! empty($tenant?->sunat_certificate),
            'has_certificate_password' => ! empty($tenant?->sunat_certificate_password),
            'has_sol_user' => ! empty($tenant?->sunat_sol_user),
            'has_sol_password' => ! empty($tenant?->sunat_sol_password),
        ];
    }
}
