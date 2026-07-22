<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class ConsentForm extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'patient_id',
        'title',
        'content',
        'signature_data',
        'signed_at',
        'signed_by_patient',
        'signed_by_guardian',
        'guardian_name',
        'guardian_dni',
        'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'signed_by_patient' => 'boolean',
            'signed_by_guardian' => 'boolean',
            'signed_at' => 'datetime',
        ];
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
