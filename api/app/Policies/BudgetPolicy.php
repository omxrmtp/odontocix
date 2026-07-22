<?php

namespace App\Policies;

use App\Models\User;

class BudgetPolicy
{
    public function view(User $user): bool
    {
        return $user->can('presupuestos.ver');
    }

    public function create(User $user): bool
    {
        return $user->can('presupuestos.editar');
    }

    public function update(User $user): bool
    {
        return $user->can('presupuestos.editar');
    }

    public function delete(User $user): bool
    {
        return $user->can('presupuestos.editar');
    }
}
