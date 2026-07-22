<?php

namespace App\Policies;

use App\Models\User;

class AuditLogPolicy
{
    public function view(User $user): bool
    {
        return $user->can('auditoria.ver');
    }
}
