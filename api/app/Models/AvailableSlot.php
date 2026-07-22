<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class AvailableSlot extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'doctor_id',
        'date',
        'start_time',
        'end_time',
        'is_available',
        'is_booked',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'is_available' => 'boolean',
            'is_booked' => 'boolean',
        ];
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }
}
