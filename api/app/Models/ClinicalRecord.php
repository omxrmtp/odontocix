<?php

namespace App\Models;

use App\Traits\Auditable;

class ClinicalRecord extends BaseModel
{
    use Auditable;
    protected $fillable = [
        'tenant_id', 'patient_id', 'doctor_id', 'record_date',
        'reason', 'diagnosis', 'pathologies', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'record_date' => 'date',
            'pathologies' => 'array',
        ];
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }
}
