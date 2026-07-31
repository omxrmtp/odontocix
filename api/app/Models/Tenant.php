<?php

namespace App\Models;

use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;

class Tenant extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains;
    use \Illuminate\Database\Eloquent\Factories\HasFactory;

    public static function getCustomColumns(): array
    {
        return [
            'id', 'name', 'ruc', 'phone', 'address', 'email', 'estado',
            'whatsapp_phone_number_id', 'whatsapp_access_token', 'whatsapp_business_account_id',
            'whatsapp_app_secret', 'whatsapp_webhook_verify_token', 'whatsapp_enabled',
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
