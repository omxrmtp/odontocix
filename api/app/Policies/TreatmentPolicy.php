<?php

namespace App\Policies;

use App\Models\User;

class TreatmentPolicy
{
    public function view(User $user): bool
    {
        return $user->can('tratamientos.ver');
    }

    public function create(User $user): bool
    {
        return $user->can('tratamientos.editar');
    }

    public function update(User $user): bool
    {
        return $user->can('tratamientos.editar');
    }

    public function delete(User $user): bool
    {
        return $user->can('tratamientos.editar');
    }
}
