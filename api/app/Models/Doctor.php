<?php

namespace App\Models;

class Doctor extends BaseModel
{
    protected $fillable = [
        'tenant_id', 'first_name', 'first_last_name', 'second_last_name',
        'cmp', 'specialty', 'phone', 'email', 'user_id',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
