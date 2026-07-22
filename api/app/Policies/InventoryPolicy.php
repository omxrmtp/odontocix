<?php

namespace App\Policies;

use App\Models\User;

class InventoryPolicy
{
    public function view(User $user): bool
    {
        return $user->can('inventario.ver');
    }

    public function create(User $user): bool
    {
        return $user->can('inventario.editar');
    }

    public function update(User $user): bool
    {
        return $user->can('inventario.editar');
    }

    public function delete(User $user): bool
    {
        return $user->can('inventario.editar');
    }
}
