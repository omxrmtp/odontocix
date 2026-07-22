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
        ];
    }

    protected function casts(): array
    {
        return array_merge(parent::casts(), [
            'data' => 'array',
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
