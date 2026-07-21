<?php

namespace App\Models;

class PatientTreatment extends BaseModel
{
    protected $fillable = [
        'tenant_id', 'patient_id', 'treatment_id', 'doctor_id',
        'status', 'agreed_price', 'tooth_fdi',
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

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }
}
