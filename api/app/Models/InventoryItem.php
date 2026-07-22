<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryItem extends BaseModel
{
    use HasFactory;
    protected $fillable = [
        'name',
        'description',
        'category',
        'sku',
        'quantity',
        'min_stock',
        'unit',
        'unit_cost',
        'supplier',
        'location',
        'expiration_date',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'min_stock' => 'integer',
            'unit_cost' => 'decimal:2',
            'expiration_date' => 'date',
        ];
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class, 'inventory_item_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
