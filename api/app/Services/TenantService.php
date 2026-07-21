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
}
