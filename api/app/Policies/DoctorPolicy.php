<?php

namespace App\Policies;

use App\Models\User;

class DoctorPolicy
{
    public function view(User $user): bool
    {
        return $user->can('doctores.ver');
    }

    public function create(User $user): bool
    {
        return $user->can('doctores.editar');
    }

    public function update(User $user): bool
    {
        return $user->can('doctores.editar');
    }

    public function delete(User $user): bool
    {
        return $user->can('doctores.editar');
    }
}
