<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Patient extends BaseModel
{
    use Auditable, HasFactory;
    protected $fillable = [
        'tenant_id', 'dni', 'first_name', 'second_name', 'first_last_name', 'second_last_name',
        'phone', 'email', 'address', 'reference', 'blood_type', 'birth_date', 'gender',
        'observations', 'reniec_cached_at', 'portal_token',
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

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function budgets()
    {
        return $this->hasMany(Budget::class);
    }
}
