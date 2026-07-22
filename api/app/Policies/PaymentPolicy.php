<?php

namespace App\Policies;

use App\Models\User;

class PaymentPolicy
{
    public function view(User $user): bool
    {
        return $user->can('pagos.ver');
    }

    public function create(User $user): bool
    {
        return $user->can('pagos.editar');
    }

    public function delete(User $user): bool
    {
        return $user->can('pagos.editar');
    }
}
