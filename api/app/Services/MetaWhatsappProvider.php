<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetaWhatsappProvider implements WhatsappProviderInterface
{
    private string $baseUrl;

    public function __construct(private WhatsappConfigResolver $configResolver)
    {
        $this->baseUrl = 'https://graph.facebook.com/'.config('whatsapp.meta.api_version');
    }

    public function sendText(string $to, string $message): array
    {
        $config = $this->configResolver->forTenant();
        $phoneNumberId = $config['phone_number_id'];
        $accessToken = $config['access_token'];

        if (! $phoneNumberId || ! $accessToken) {
            throw new \RuntimeException('WhatsApp no configurado. Falta phone_number_id o access_token.');
        }

        $url = "{$this->baseUrl}/{$phoneNumberId}/messages";

        $response = Http::withToken($accessToken)
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
        $config = $this->configResolver->forTenant();
        $phoneNumberId = $config['phone_number_id'];
        $accessToken = $config['access_token'];

        if (! $phoneNumberId || ! $accessToken) {
            throw new \RuntimeException('WhatsApp no configurado.');
        }

        $url = "{$this->baseUrl}/{$phoneNumberId}/messages";

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

        $response = Http::withToken($accessToken)->post($url, $payload);

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
        $appSecret = $this->configResolver->forTenant()['app_secret'];
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
