<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function view(User $user): bool
    {
        return $user->can('configuracion.ver');
    }

    public function create(User $user): bool
    {
        return $user->can('configuracion.editar');
    }

    public function update(User $user): bool
    {
        return $user->can('configuracion.editar');
    }

    public function delete(User $user): bool
    {
        return $user->can('configuracion.editar');
    }
}
