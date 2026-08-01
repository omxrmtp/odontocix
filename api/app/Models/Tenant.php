<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;
use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;

class Tenant extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains;
    use HasFactory;

    public static function getCustomColumns(): array
    {
        return [
            'id', 'name', 'ruc', 'phone', 'address', 'email', 'estado', 'is_demo',
            'whatsapp_phone_number_id', 'whatsapp_access_token', 'whatsapp_business_account_id',
            'whatsapp_app_secret', 'whatsapp_webhook_verify_token', 'whatsapp_enabled',
            'sunat_enabled', 'sunat_environment', 'sunat_certificate', 'sunat_certificate_password',
            'sunat_certificate_name', 'sunat_sol_user', 'sunat_sol_password',
            'sunat_serie_boleta', 'sunat_serie_factura',
            'sunat_correlative_boleta', 'sunat_correlative_factura',
        ];
    }

    protected function casts(): array
    {
        return array_merge(parent::casts(), [
            'data' => 'array',
            'whatsapp_access_token' => 'encrypted',
            'whatsapp_app_secret' => 'encrypted',
            'whatsapp_webhook_verify_token' => 'encrypted',
            'whatsapp_enabled' => 'boolean',
            'sunat_certificate' => 'encrypted',
            'sunat_certificate_password' => 'encrypted',
            'sunat_sol_password' => 'encrypted',
            'sunat_enabled' => 'boolean',
            'is_demo' => 'boolean',
        ]);
    }

    public function users()
    {
        return $this->hasMany(User::class, 'tenant_id', 'id');
    }

    protected function initializeTenancy(): void
    {
        tenancy()->initialize($this);
    }
}
