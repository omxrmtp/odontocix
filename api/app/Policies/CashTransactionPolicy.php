<?php

namespace App\Policies;

use App\Models\User;

class CashTransactionPolicy
{
    public function view(User $user): bool
    {
        return $user->can('caja.ver');
    }

    public function create(User $user): bool
    {
        return $user->can('caja.editar');
    }

    public function delete(User $user): bool
    {
        return $user->can('caja.editar');
    }
}
