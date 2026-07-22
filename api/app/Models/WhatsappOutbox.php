<?php

namespace App\Models;

class WhatsappOutbox extends BaseModel
{
    protected $table = 'whatsapp_outbox';

    protected $fillable = [
        'tenant_id', 'appointment_id', 'recipient_phone', 'recipient_type',
        'message_template', 'message', 'status', 'sent_at',
    ];

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }
}
