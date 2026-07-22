<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Budget extends BaseModel
{
    use Auditable, HasFactory;
    protected $fillable = [
        'tenant_id', 'patient_id', 'total', 'discount_percent', 'discount_amount',
        'grand_total', 'status', 'financing', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'financing' => 'array',
        ];
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function items()
    {
        return $this->hasMany(BudgetItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function getPaidAmountAttribute()
    {
        return $this->payments()->sum('amount');
    }

    public function getBalanceAttribute()
    {
        return $this->grand_total - $this->paid_amount;
    }
}
