<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class CashTransaction extends BaseModel
{
    use Auditable, HasFactory;
    protected $fillable = [
        'tenant_id', 'type', 'amount', 'category', 'concept',
        'transaction_date', 'payment_id', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'transaction_date' => 'date',
        ];
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
