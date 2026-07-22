<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    private function isSuperAdmin(): bool
    {
        return auth()->user()?->hasRole('Super Admin') ?? false;
    }

    private function scopeQuery($query)
    {
        if (!$this->isSuperAdmin()) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }
        return $query;
    }

    private function ensureSameTenant(User $user): void
    {
        if (!$this->isSuperAdmin() && $user->tenant_id !== auth()->user()->tenant_id) {
            throw new AuthorizationException('No tienes permisos para acceder a este usuario.');
        }
    }

    public function index(): JsonResponse
    {
        $this->authorize('view', User::class);

        $users = $this->scopeQuery(User::query())
            ->with('roles')
            ->get();

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', User::class);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'required|string|exists:roles,name',
        ]);

        // Bloquear asignación de Super Admin
        if ($data['role'] === 'Super Admin') {
            return response()->json(['message' => 'No se puede asignar el rol Super Admin'], 403);
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'tenant_id' => auth()->user()->tenant_id,
        ]);

        $user->assignRole($data['role']);

        return response()->json($user->load('roles'), 201);
    }

    public function show(User $user): JsonResponse
    {
        $this->authorize('view', User::class);
        $this->ensureSameTenant($user);

        return response()->json($user->load('roles', 'permissions'));
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorize('update', User::class);
        $this->ensureSameTenant($user);

        // Bloquear modificación de usuarios Super Admin (excepto si eres Super Admin)
        if ($user->hasRole('Super Admin') && !$this->isSuperAdmin()) {
            return response()->json(['message' => 'No se puede modificar un Super Admin'], 403);
        }

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => 'sometimes|string|min:6',
        ]);

        if (isset($data['name'])) $user->name = $data['name'];
        if (isset($data['email'])) $user->email = $data['email'];
        if (isset($data['password'])) $user->password = Hash::make($data['password']);
        $user->save();

        return response()->json($user->load('roles'));
    }

    public function assignRole(Request $request, User $user): JsonResponse
    {
        $this->authorize('update', User::class);
        $this->ensureSameTenant($user);

        $data = $request->validate([
            'role' => 'required|string|exists:roles,name',
        ]);

        // Bloquear asignación de Super Admin
        if ($data['role'] === 'Super Admin') {
            return response()->json(['message' => 'No se puede asignar el rol Super Admin'], 403);
        }

        // Bloquear modificación de Super Admin
        if ($user->hasRole('Super Admin') && !$this->isSuperAdmin()) {
            return response()->json(['message' => 'No se puede modificar un Super Admin'], 403);
        }

        $user->syncRoles([$data['role']]);

        return response()->json($user->load('roles', 'permissions'));
    }

    public function toggleActive(User $user): JsonResponse
    {
        $this->authorize('update', User::class);
        $this->ensureSameTenant($user);

        // Bloquear desactivación de Super Admin
        if ($user->hasRole('Super Admin')) {
            return response()->json(['message' => 'No se puede desactivar un Super Admin'], 403);
        }

        // Bloquear auto-desactivación
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'No puedes desactivar tu propia cuenta'], 403);
        }

        $user->is_active = !($user->is_active ?? true);
        $user->save();

        return response()->json($user->load('roles'));
    }

    public function destroy(User $user): JsonResponse
    {
        $this->authorize('delete', User::class);
        $this->ensureSameTenant($user);

        // Bloquear auto-eliminación
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'No puedes eliminar tu propia cuenta'], 403);
        }

        // Bloquear eliminación de Super Admin
        if ($user->hasRole('Super Admin')) {
            return response()->json(['message' => 'No se puede eliminar un Super Admin'], 403);
        }

        $user->delete();
        return response()->json(['message' => 'Usuario eliminado']);
    }
}
