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
            $service = App::make(TenantService::class);
            if ($tenantId = $service->id()) {
                $model->tenant_id = $tenantId;
            }
        });

        static::addGlobalScope('tenant', function ($query) {
            $service = App::make(TenantService::class);
            if ($tenantId = $service->id()) {
                $query->where($query->getModel()->getTable().'.tenant_id', $tenantId);
            }
        });
    }
}
