<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    private const SYSTEM_ROLES = ['Super Admin', 'Admin Clinica'];

    private function isSuperAdmin(): bool
    {
        return auth()->user()?->hasRole('Super Admin') ?? false;
    }

    public function index(): JsonResponse
    {
        $this->authorize('view', \App\Models\User::class);

        $roles = Role::with('permissions')->get();
        return response()->json($roles);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', \App\Models\User::class);

        $data = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        // Bloquear crear roles con nombres de sistema
        if (in_array($data['name'], self::SYSTEM_ROLES, true)) {
            return response()->json(['message' => 'No se puede crear un rol de sistema'], 403);
        }

        $role = Role::create(['name' => $data['name'], 'guard_name' => 'web']);
        if (!empty($data['permissions'])) {
            $role->syncPermissions($data['permissions']);
        }

        return response()->json($role->load('permissions'), 201);
    }

    public function show(Role $role): JsonResponse
    {
        $this->authorize('view', \App\Models\User::class);

        return response()->json($role->load('permissions'));
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $this->authorize('update', \App\Models\User::class);

        // Bloquear modificación de roles de sistema
        if (in_array($role->name, self::SYSTEM_ROLES, true)) {
            return response()->json(['message' => 'No se puede modificar un rol de sistema'], 403);
        }

        $data = $request->validate([
            'name' => 'sometimes|string|max:255|unique:roles,name,' . $role->id,
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        if (isset($data['name'])) {
            // No permitir renombrar a un rol de sistema
            if (in_array($data['name'], self::SYSTEM_ROLES, true)) {
                return response()->json(['message' => 'No se puede renombrar a un rol de sistema'], 403);
            }
            $role->name = $data['name'];
            $role->save();
        }
        if (isset($data['permissions'])) {
            $role->syncPermissions($data['permissions']);
        }

        return response()->json($role->load('permissions'));
    }

    public function destroy(Role $role): JsonResponse
    {
        $this->authorize('delete', \App\Models\User::class);

        if (in_array($role->name, self::SYSTEM_ROLES, true)) {
            return response()->json(['message' => 'No se puede eliminar un rol de sistema'], 403);
        }

        $role->delete();
        return response()->json(['message' => 'Rol eliminado']);
    }

    public function permissions(): JsonResponse
    {
        $this->authorize('view', \App\Models\User::class);

        $permissions = Permission::all()
            ->groupBy(function ($perm) {
                return explode('.', $perm->name)[0];
            })
            ->map(function ($perms, $module) {
                return [
                    'module' => $module,
                    'permissions' => $perms->pluck('name')->values(),
                ];
            })
            ->values();

        return response()->json($permissions);
    }
}
