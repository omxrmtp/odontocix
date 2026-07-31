<?php

namespace App\Services;

use App\Models\Tenant;

class WhatsappConfigResolver
{
    public function __construct(private TenantService $tenantService) {}

    public function forTenant(?Tenant $tenant = null): array
    {
        $tenant = $tenant ?? $this->tenantService->current();

        return [
            'api_version' => config('whatsapp.meta.api_version'),
            'phone_number_id' => $tenant?->whatsapp_phone_number_id
                ?: config('whatsapp.meta.phone_number_id'),
            'business_account_id' => $tenant?->whatsapp_business_account_id
                ?: config('whatsapp.meta.business_account_id'),
            'access_token' => $tenant?->whatsapp_access_token
                ?: config('whatsapp.meta.access_token'),
            'webhook_verify_token' => $tenant?->whatsapp_webhook_verify_token
                ?: config('whatsapp.meta.webhook_verify_token'),
            'app_secret' => $tenant?->whatsapp_app_secret
                ?: config('whatsapp.meta.app_secret'),
            'enabled' => $tenant?->whatsapp_enabled ?? false,
        ];
    }
}
