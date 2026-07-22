<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Payment extends BaseModel
{
    use Auditable, HasFactory;
    protected $fillable = [
        'tenant_id', 'budget_id', 'patient_id', 'amount',
        'payment_date', 'method', 'reference', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date',
        ];
    }

    public function budget()
    {
        return $this->belongsTo(Budget::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
