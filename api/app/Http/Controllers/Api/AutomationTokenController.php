<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AutomationTokenController extends Controller
{
    private const SCOPES = [
        'patients:read',
        'patients:write',
        'appointments:read',
        'appointments:write',
        'budgets:read',
        'payments:read',
        'availability:read',
        'webhooks:manage',
    ];

    public function index(Request $request): JsonResponse
    {
        $tokens = $request->user()->tokens()
            ->where('name', 'like', 'automation:%')
            ->get()
            ->map(fn ($t) => [
                'id'        => $t->id,
                'name'      => str_replace('automation:', '', $t->name),
                'scopes'    => $t->abilities,
                'last_used' => $t->last_used_at?->toDateTimeString(),
                'created_at' => $t->created_at->toDateTimeString(),
            ]);

        return response()->json($tokens);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'   => 'required|string|max:255',
            'scopes' => 'required|array',
            'scopes.*' => 'in:'.implode(',', self::SCOPES),
            'expires_at' => 'nullable|date|after:now',
        ]);

        $token = $request->user()->createToken(
            'automation:'.$data['name'],
            $data['scopes'],
            $data['expires_at'] ?? null
        );

        return response()->json([
            'token'      => $token->plainTextToken,
            'name'       => $data['name'],
            'scopes'     => $data['scopes'],
            'expires_at' => $data['expires_at'] ?? null,
        ], 201);
    }

    public function destroy(Request $request, int $tokenId): JsonResponse
    {
        $deleted = $request->user()->tokens()
            ->where('id', $tokenId)
            ->where('name', 'like', 'automation:%')
            ->delete();

        if (! $deleted) {
            return response()->json(['message' => 'Token no encontrado.'], 404);
        }

        return response()->json(['message' => 'Token revocado.']);
    }
}
