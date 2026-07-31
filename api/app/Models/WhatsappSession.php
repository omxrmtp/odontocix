<?php

namespace App\Models;

class WhatsappSession extends BaseModel
{
    protected $fillable = [
        'tenant_id',
        'phone',
        'state',
        'data',
        'last_activity',
    ];

    protected function casts(): array
    {
        return [
            'data'         => 'array',
            'last_activity' => 'datetime',
        ];
    }
}
