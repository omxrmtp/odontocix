<?php

namespace App\Models;

class IdempotencyKey extends BaseModel
{
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'key',
        'tenant_id',
        'resource_type',
        'status',
        'request_payload',
        'response_payload',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'request_payload'  => 'array',
            'response_payload' => 'array',
            'expires_at'       => 'datetime',
        ];
    }
}
