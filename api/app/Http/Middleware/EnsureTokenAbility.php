<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTokenAbility
{
    /**
     * Comprueba que el token Sanctum actual tenga la ability requerida.
     */
    public function handle(Request $request, Closure $next, string $ability): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        if (! $user->currentAccessToken()?->can($ability)) {
            return response()->json(['message' => "No tienes permiso para realizar esta acción ({$ability})."], 403);
        }

        return $next($request);
    }
}
