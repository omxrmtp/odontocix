<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

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
