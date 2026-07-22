<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PatientTreatment extends BaseModel
{
    use Auditable, HasFactory;
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
