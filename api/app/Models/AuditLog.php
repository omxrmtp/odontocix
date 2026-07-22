<?php

namespace App\Models;

class AuditLog extends BaseModel
{
    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'user_name',
        'action',
        'resource_type',
        'resource_id',
        'old_values',
        'new_values',
        'ip_address',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
