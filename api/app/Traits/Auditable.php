<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Request;

trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function (Model $model) {
            if (! auth()->check()) {
                return;
            }

            AuditLog::create([
                'tenant_id' => $model->tenant_id,
                'user_id' => auth()->id(),
                'user_name' => auth()->user()?->name,
                'action' => 'created',
                'resource_type' => class_basename($model),
                'resource_id' => $model->id,
                'old_values' => null,
                'new_values' => $model->getAttributes(),
                'ip_address' => Request::ip(),
            ]);
        });

        static::updated(function (Model $model) {
            if (! auth()->check()) {
                return;
            }

            $changes = $model->getChanges();
            if (empty($changes)) {
                return;
            }

            $oldValues = array_intersect_key($model->getOriginal(), $changes);

            AuditLog::create([
                'tenant_id' => $model->tenant_id,
                'user_id' => auth()->id(),
                'user_name' => auth()->user()?->name,
                'action' => 'updated',
                'resource_type' => class_basename($model),
                'resource_id' => $model->id,
                'old_values' => $oldValues,
                'new_values' => $changes,
                'ip_address' => Request::ip(),
            ]);
        });

        static::deleted(function (Model $model) {
            if (! auth()->check()) {
                return;
            }

            AuditLog::create([
                'tenant_id' => $model->tenant_id,
                'user_id' => auth()->id(),
                'user_name' => auth()->user()?->name,
                'action' => 'deleted',
                'resource_type' => class_basename($model),
                'resource_id' => $model->id,
                'old_values' => $model->getAttributes(),
                'new_values' => null,
                'ip_address' => Request::ip(),
            ]);
        });
    }
}
