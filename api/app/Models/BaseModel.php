<?php

namespace App\Models;

use App\Services\TenantService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\App;

abstract class BaseModel extends Model
{
    protected static function booted(): void
    {
        static::creating(function (Model $model) {
            $tenantId = App::make(TenantService::class)->id();
            if (!$tenantId && auth()->check()) {
                $tenantId = auth()->user()->tenant_id;
            }
            if (!$tenantId) {
                throw new \RuntimeException('No se encontró un tenant activo. Inicie sesión en una clínica específica.');
            }
            $model->tenant_id = $tenantId;
        });

        static::addGlobalScope('tenant', function ($query) {
            $tenantId = App::make(TenantService::class)->id();
            if ($tenantId) {
                $query->where($query->getModel()->getTable().'.tenant_id', $tenantId);
            }
        });
    }
}
