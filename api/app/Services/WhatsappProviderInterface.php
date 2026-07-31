<?php

namespace App\Services;

interface WhatsappProviderInterface
{
    /**
     * Enviar mensaje de texto a un número de teléfono.
     */
    public function sendText(string $to, string $message): array;

    /**
     * Enviar mensaje usando plantilla aprobada (para iniciar conversación >24h).
     */
    public function sendTemplate(string $to, string $templateName, array $parameters = [], string $language = 'es'): array;

    /**
     * Verificar firma del webhook entrante.
     */
    public function verifySignature(string $payload, string $signature): bool;
}
