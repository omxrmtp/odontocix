<?php

namespace App\Http\Middleware;

use App\Services\IdempotencyService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IdempotencyMiddleware
{
    public function __construct(private IdempotencyService $idempotency) {}

    public function handle(Request $request, Closure $next, string $resourceType): Response
    {
        $key = $request->header('Idempotency-Key');

        if (! $key) {
            return $next($request);
        }

        if (! preg_match('/^[a-zA-Z0-9_-]{1,64}$/', $key)) {
            return response()->json(['message' => 'Idempotency-Key inválido. Usa hasta 64 caracteres alfanuméricos.'], 422);
        }

        $tenantId = app(\App\Services\TenantService::class)->id()
            ?? ($request->user()?->tenant_id);

        if (! $tenantId) {
            return response()->json(['message' => 'No se pudo determinar el tenant para idempotencia.'], 400);
        }

        $existing = $this->idempotency->get($key, $tenantId, $resourceType);

        if ($existing) {
            if ($existing->status === 'processing') {
                return response()->json(['message' => 'La operación está siendo procesada. Intente más tarde.'], 409);
            }

            if ($existing->status === 'completed') {
                return response()->json($existing->response_payload ?? ['message' => 'Operación ya completada.']);
            }
        }

        $record = $this->idempotency->start($key, $tenantId, $resourceType, $request->all());

        try {
            $response = $next($request);

            $payload = $response instanceof Response
                ? json_decode($response->getContent(), true) ?? []
                : [];

            $this->idempotency->complete($record, $payload);
        } catch (\Throwable $e) {
            $this->idempotency->fail($record, ['message' => $e->getMessage()]);
            throw $e;
        }

        return $response;
    }
}
