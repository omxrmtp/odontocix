<?php

namespace App\Policies;

use App\Models\User;

class PatientPolicy
{
    public function view(User $user): bool
    {
        return $user->can('pacientes.ver');
    }

    public function create(User $user): bool
    {
        return $user->can('pacientes.editar');
    }

    public function update(User $user): bool
    {
        return $user->can('pacientes.editar');
    }

    public function delete(User $user): bool
    {
        return $user->can('pacientes.editar');
    }
}
