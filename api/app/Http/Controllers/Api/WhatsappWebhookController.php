<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\WhatsappBotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WhatsappWebhookController extends Controller
{
    public function __construct(
        private WhatsappBotService $bot,
        private \App\Services\WhatsappProviderInterface $whatsapp,
        private \App\Services\TenantService $tenantService,
    ) {}

    /**
     * Verificación del webhook por Meta (GET).
     */
    public function verify(Request $request): JsonResponse
    {
        // PHP convierte puntos en query params a guiones bajos
        $mode      = $request->query('hub_mode') ?? $request->query('hub.mode');
        $token     = $request->query('hub_verify_token') ?? $request->query('hub.verify_token');
        $challenge = $request->query('hub_challenge') ?? $request->query('hub.challenge');
        $expected  = config('whatsapp.meta.webhook_verify_token');

        if ($mode === 'subscribe' && $token === $expected) {
            Log::info('WhatsApp webhook verificado', ['challenge' => $challenge]);
            return response()->json((int) $challenge);
        }

        Log::warning('WhatsApp webhook verificación fallida', ['mode' => $mode, 'token' => $token]);
        return response()->json(['message' => 'Verificación fallida.'], 403);
    }

    /**
     * Recepción de mensajes y eventos (POST).
     */
    public function receive(Request $request): JsonResponse
    {
        $entries = $request->input('entry', []);

        // Resolver tenant por phone_number_id antes de validar la firma
        $phoneNumberId = $this->resolveFirstPhoneNumberId($entries);
        if ($phoneNumberId) {
            $tenant = Tenant::query()
                ->where('whatsapp_phone_number_id', $phoneNumberId)
                ->first();

            if ($tenant) {
                $this->tenantService->setCurrent($tenant);
            }
        }

        // Verificar firma si está configurada
        $signature = $request->header('X-Hub-Signature-256');
        if ($signature) {
            $payload = $request->getContent();
            if (! $this->whatsapp->verifySignature($payload, $signature)) {
                Log::warning('WhatsApp firma inválida');
                return response()->json(['message' => 'Firma inválida.'], 401);
            }
        }

        foreach ($entries as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                $value = $change['value'] ?? [];

                // Procesar mensajes entrantes
                foreach ($value['messages'] ?? [] as $message) {
                    $this->processMessage($value, $message);
                }

                // Procesar actualizaciones de estado (delivered, read, failed)
                foreach ($value['statuses'] ?? [] as $status) {
                    $this->processStatus($status);
                }
            }
        }

        return response()->json(['message' => 'OK']);
    }

    private function resolveFirstPhoneNumberId(array $entries): ?string
    {
        foreach ($entries as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                $value = $change['value'] ?? [];
                $phoneNumberId = $value['metadata']['phone_number_id'] ?? null;
                if ($phoneNumberId) {
                    return $phoneNumberId;
                }
            }
        }

        return null;
    }

    private function processMessage(array $value, array $message): void
    {
        $from     = $message['from'] ?? null;
        $body     = $message['text']['body'] ?? '';
        $phoneNumberId = $value['metadata']['phone_number_id'] ?? null;

        if (! $from || ! $phoneNumberId) {
            return;
        }

        // Resolver tenant por phone_number_id
        $tenant = Tenant::query()
            ->where('whatsapp_phone_number_id', $phoneNumberId)
            ->first();

        if (! $tenant) {
            Log::warning('WhatsApp: tenant no encontrado para phone_number_id', ['phone_number_id' => $phoneNumberId]);
            return;
        }

        // Inicializar tenant
        app(\App\Services\TenantService::class)->setCurrent($tenant);
        if (class_exists('tenancy') && !tenancy()->initialized) {
            tenancy()->initialize($tenant);
        }

        Log::info('WhatsApp inbound message', [
            'from' => $from,
            'body' => $body,
            'tenant_id' => $tenant->id,
        ]);

        try {
            $this->bot->handleInboundMessage($tenant->id, $from, $body);
        } catch (\Throwable $e) {
            Log::error('WhatsApp bot error', ['error' => $e->getMessage(), 'from' => $from]);
        }
    }

    private function processStatus(array $status): void
    {
        $messageId = $status['id'] ?? null;
        $state     = $status['status'] ?? null; // sent, delivered, read, failed

        if (! $messageId) {
            return;
        }

        // Actualizar whatsapp_outbox si existe
        $outbox = \App\Models\WhatsappOutbox::where('message', 'like', "%{$messageId}%")->first();
        if ($outbox) {
            $outbox->update([
                'status'  => $state,
                'sent_at' => $state === 'sent' ? now() : $outbox->sent_at,
            ]);
        }
    }
}
