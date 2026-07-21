<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'name', 'ruc', 'phone', 'address', 'email', 'estado', 'data',
    ];

    protected static function booted(): void
    {
        static::creating(function (Tenant $tenant) {
            if (! $tenant->id) {
                $tenant->id = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'data' => 'array',
        ];
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
