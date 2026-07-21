<?php

namespace App\Models;

class Treatment extends BaseModel
{
    protected $fillable = [
        'tenant_id', 'name', 'description', 'base_price', 'estimated_duration_min',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
