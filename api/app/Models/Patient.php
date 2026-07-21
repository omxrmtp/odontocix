<?php

namespace App\Models;

class Patient extends BaseModel
{
    protected $fillable = [
        'tenant_id', 'dni', 'first_name', 'first_last_name', 'second_last_name',
        'phone', 'address', 'blood_type', 'birth_date', 'observations', 'reniec_cached_at',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function clinicalRecords()
    {
        return $this->hasMany(ClinicalRecord::class);
    }

    public function teethRecords()
    {
        return $this->hasMany(TeethRecord::class);
    }

    public function treatments()
    {
        return $this->hasMany(PatientTreatment::class);
    }
}
