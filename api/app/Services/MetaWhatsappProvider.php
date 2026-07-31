<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetaWhatsappProvider implements WhatsappProviderInterface
{
    private string $baseUrl;
    private ?string $phoneNumberId;
    private ?string $accessToken;

    public function __construct()
    {
        $this->baseUrl = 'https://graph.facebook.com/'.config('whatsapp.meta.api_version');
        $this->phoneNumberId = config('whatsapp.meta.phone_number_id');
        $this->accessToken = config('whatsapp.meta.access_token');
    }

    public function sendText(string $to, string $message): array
    {
        if (! $this->phoneNumberId || ! $this->accessToken) {
            throw new \RuntimeException('WhatsApp no configurado. Falta phone_number_id o access_token.');
        }

        $url = "{$this->baseUrl}/{$this->phoneNumberId}/messages";

        $response = Http::withToken($this->accessToken)
            ->post($url, [
                'messaging_product' => 'whatsapp',
                'recipient_type'    => 'individual',
                'to'                => $this->normalizePhone($to),
                'type'              => 'text',
                'text'              => ['body' => $message],
            ]);

        if ($response->failed()) {
            Log::error('Meta WhatsApp sendText failed', [
                'to' => $to,
                'error' => $response->json(),
            ]);
            throw new \RuntimeException('Error enviando mensaje WhatsApp: '.($response->json('error.message') ?? 'Unknown'));
        }

        return $response->json();
    }

    public function sendTemplate(string $to, string $templateName, array $parameters = [], string $language = 'es'): array
    {
        if (! $this->phoneNumberId || ! $this->accessToken) {
            throw new \RuntimeException('WhatsApp no configurado.');
        }

        $url = "{$this->baseUrl}/{$this->phoneNumberId}/messages";

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type'    => 'individual',
            'to'                => $this->normalizePhone($to),
            'type'              => 'template',
            'template'          => [
                'name'     => $templateName,
                'language' => ['code' => $language],
            ],
        ];

        if (! empty($parameters)) {
            $payload['template']['components'] = [
                [
                    'type'       => 'body',
                    'parameters' => array_map(fn ($p) => ['type' => 'text', 'text' => $p], $parameters),
                ],
            ];
        }

        $response = Http::withToken($this->accessToken)->post($url, $payload);

        if ($response->failed()) {
            Log::error('Meta WhatsApp sendTemplate failed', [
                'to' => $to,
                'template' => $templateName,
                'error' => $response->json(),
            ]);
            throw new \RuntimeException('Error enviando plantilla WhatsApp: '.($response->json('error.message') ?? 'Unknown'));
        }

        return $response->json();
    }

    public function verifySignature(string $payload, string $signature): bool
    {
        $appSecret = config('whatsapp.meta.app_secret');
        if (! $appSecret) {
            // Si no hay app_secret configurado, aceptar todo (modo desarrollo)
            return true;
        }

        $expected = hash_hmac('sha256', $payload, $appSecret);

        return hash_equals($expected, $signature);
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/[^0-9]/', '', $phone);

        // Perú: agregar 51 si no lo tiene
        if (strlen($digits) === 9 && str_starts_with($digits, '9')) {
            $digits = '51'.$digits;
        }

        return $digits;
    }
}
