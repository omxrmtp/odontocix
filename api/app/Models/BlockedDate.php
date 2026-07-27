<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class BlockedDate extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'date',
        'reason',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
        ];
    }
}
