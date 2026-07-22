<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles', 'permissions', 'tenant');

        return response()->json([
            'user' => $user,
            'tenant' => $user->tenant,
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
        ]);

        $user->update($data);

        return response()->json($user->fresh()->load('roles'));
    }

    public function password(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if (!Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['La contraseña actual no coincide.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($data['password']),
        ]);

        return response()->json(['message' => 'Contraseña actualizada correctamente.']);
    }

    public function tenant(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        return response()->json($tenant);
    }

    public function updateTenant(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'ruc' => 'required|string|size:11',
            'phone' => 'required|string|max:20',
            'address' => 'required|string|max:255',
            'email' => 'required|email|max:255',
        ]);

        $tenant->update($data);

        return response()->json($tenant);
    }
}
