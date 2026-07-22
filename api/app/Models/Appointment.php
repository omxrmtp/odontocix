<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Appointment extends BaseModel
{
    use Auditable, HasFactory;
    protected $fillable = [
        'tenant_id', 'patient_id', 'doctor_id', 'start_date', 'end_date',
        'status', 'reason', 'notes',
        'whatsapp_patient_sent', 'whatsapp_doctor_sent',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'datetime',
            'end_date' => 'datetime',
            'whatsapp_patient_sent' => 'boolean',
            'whatsapp_doctor_sent' => 'boolean',
        ];
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }

    public function whatsappMessages()
    {
        return $this->hasMany(WhatsappOutbox::class);
    }
}
