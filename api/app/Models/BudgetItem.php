<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class BudgetItem extends BaseModel
{
    use HasFactory;
    protected $fillable = [
        'tenant_id', 'budget_id', 'treatment_id', 'description',
        'tooth_fdi', 'quantity', 'unit_price', 'subtotal',
    ];

    public function budget()
    {
        return $this->belongsTo(Budget::class);
    }

    public function treatment()
    {
        return $this->belongsTo(Treatment::class);
    }
}
