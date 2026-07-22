<?php

namespace App\Policies;

use App\Models\User;

class ConsentFormPolicy
{
    public function view(User $user): bool
    {
        return $user->can('consentimientos.ver');
    }

    public function create(User $user): bool
    {
        return $user->can('consentimientos.editar');
    }

    public function update(User $user): bool
    {
        return $user->can('consentimientos.editar');
    }

    public function delete(User $user): bool
    {
        return $user->can('consentimientos.editar');
    }
}
