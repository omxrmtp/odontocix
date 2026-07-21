<?php

namespace App\Models;

class TeethRecord extends BaseModel
{
    protected $fillable = [
        'tenant_id', 'patient_id', 'fdi_code', 'status', 'surface', 'treatment_id', 'notes',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function treatment()
    {
        return $this->belongsTo(Treatment::class);
    }
}
