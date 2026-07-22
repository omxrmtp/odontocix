<?php

namespace App\Policies;

use App\Models\User;

class AppointmentPolicy
{
    public function view(User $user): bool
    {
        return $user->can('citas.ver');
    }

    public function create(User $user): bool
    {
        return $user->can('citas.editar');
    }

    public function update(User $user): bool
    {
        return $user->can('citas.editar');
    }

    public function delete(User $user): bool
    {
        return $user->can('citas.editar');
    }
}
