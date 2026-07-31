<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LlmService
{
    private string $baseUrl;
    private string $apiKey;
    private string $model;

    public function __construct()
    {
        $this->baseUrl = rtrim(env('LLM_BASE_URL', 'https://api.deepseek.com'), '/');
        $this->apiKey  = env('LLM_API_KEY', '');
        $this->model   = env('LLM_MODEL', 'deepseek-chat');
    }

    /**
     * Enviar mensaje al LLM con system prompt y devolver JSON estructurado.
     */
    public function chat(string $systemPrompt, array $messages): array
    {
        if (! $this->apiKey) {
            throw new \RuntimeException('LLM no configurado. Falta LLM_API_KEY.');
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$this->apiKey,
            'Content-Type'    => 'application/json',
        ])->post($this->baseUrl.'/chat/completions', [
            'model'       => $this->model,
            'messages'    => array_merge(
                [['role' => 'system', 'content' => $systemPrompt]],
                $messages
            ),
            'temperature' => 0.3,
            'max_tokens'  => 500,
        ]);

        if ($response->failed()) {
            Log::error('LLM API error', ['error' => $response->json(), 'status' => $response->status()]);
            throw new \RuntimeException('Error del LLM: '.($response->json('error.message') ?? 'Unknown'));
        }

        $content = $response->json('choices.0.message.content');

        // Intentar parsear JSON
        $json = json_decode($content, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($json)) {
            return $json;
        }

        // Si no es JSON válido, devolver estructura genérica
        return [
            'action' => 'unknown',
            'response' => $content,
        ];
    }
}
