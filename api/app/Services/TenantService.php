<?php

namespace App\Services;

use App\Models\Tenant;

class TenantService
{
    private ?Tenant $currentTenant = null;

    public function setCurrent(?Tenant $tenant): void
    {
        $this->currentTenant = $tenant;
    }

    public function current(): ?Tenant
    {
        return $this->currentTenant;
    }

    public function id(): ?string
    {
        return $this->currentTenant?->id;
    }

    /**
     * Determina si el tenant activo es un entorno demo (rollback por request).
     */
    public static function isDemo(): bool
    {
        $service = app(self::class);

        return (bool) ($service->current()?->is_demo ?? false);
    }
}
