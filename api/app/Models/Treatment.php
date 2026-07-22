<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Treatment extends BaseModel
{
    use Auditable, HasFactory;
    protected $fillable = [
        'tenant_id', 'name', 'description', 'base_price', 'estimated_duration_min',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
