<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class ConsentTemplate extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'title',
        'content',
        'category',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }
}
