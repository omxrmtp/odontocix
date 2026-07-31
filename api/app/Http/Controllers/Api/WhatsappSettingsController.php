<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsappSettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        return response()->json([
            'phone_number_id' => $tenant->whatsapp_phone_number_id,
            'business_account_id' => $tenant->whatsapp_business_account_id,
            'enabled' => $tenant->whatsapp_enabled,
            'has_access_token' => ! empty($tenant->whatsapp_access_token),
            'has_app_secret' => ! empty($tenant->whatsapp_app_secret),
            'has_webhook_verify_token' => ! empty($tenant->whatsapp_webhook_verify_token),
            'access_token_last4' => $this->last4($tenant->whatsapp_access_token),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        $data = $request->validate([
            'phone_number_id' => 'nullable|string|max:255',
            'business_account_id' => 'nullable|string|max:255',
            'access_token' => 'nullable|string|max:2048',
            'app_secret' => 'nullable|string|max:255',
            'webhook_verify_token' => 'nullable|string|max:255',
            'enabled' => 'nullable|boolean',
        ]);

        $fields = [
            'whatsapp_phone_number_id' => $data['phone_number_id'] ?? null,
            'whatsapp_business_account_id' => $data['business_account_id'] ?? null,
            'whatsapp_access_token' => $data['access_token'] ?? null,
            'whatsapp_app_secret' => $data['app_secret'] ?? null,
            'whatsapp_webhook_verify_token' => $data['webhook_verify_token'] ?? null,
        ];

        // Campos vacíos conservan el valor existente
        foreach ($fields as $column => $value) {
            if ($value === null || $value === '') {
                unset($fields[$column]);
            }
        }

        if (array_key_exists('enabled', $data)) {
            $fields['whatsapp_enabled'] = $data['enabled'];
        }

        $tenant->update($fields);

        return response()->json([
            'message' => 'Configuración de WhatsApp guardada correctamente.',
        ]);
    }

    private function last4(?string $value): ?string
    {
        if (empty($value)) {
            return null;
        }

        return '••••'.substr($value, -4);
    }
}
