<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private function userResponse(User $user): array
    {
        $user->load('roles', 'permissions', 'tenant');
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_active' => $user->is_active,
            'tenant_id' => $user->tenant_id,
            'roles' => $user->roles->map(fn ($r) => ['id' => $r->id, 'name' => $r->name])->toArray(),
            'permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
            'tenant' => $user->tenant,
        ];
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tenant_name' => 'required|string|max:255',
            'tenant_ruc' => 'required|string|size:11',
            'tenant_phone' => 'required|string|max:20',
            'tenant_address' => 'required|string|max:255',
            'tenant_email' => 'required|email|max:255',
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users',
            'password' => 'required|string|min:8',
        ]);

        $tenant = Tenant::create([
            'name' => $data['tenant_name'],
            'ruc' => $data['tenant_ruc'],
            'phone' => $data['tenant_phone'],
            'address' => $data['tenant_address'],
            'email' => $data['tenant_email'],
            'estado' => 'active',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'tenant_id' => $tenant->id,
        ]);

        $user->assignRole('Admin Clinica');

        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            ...$this->userResponse($user),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciales inválidas.'],
            ]);
        }

        // Verificar que el usuario esté activo
        if (! ($user->is_active ?? true)) {
            throw ValidationException::withMessages([
                'email' => ['Tu cuenta ha sido desactivada.'],
            ]);
        }

        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            ...$this->userResponse($user),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->userResponse($request->user()));
    }
}
