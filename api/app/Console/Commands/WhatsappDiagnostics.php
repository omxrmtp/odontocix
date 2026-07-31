<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class WhatsappDiagnostics extends Command
{
    protected $signature = 'whatsapp:diagnostics {tenant_id?}';

    protected $description = 'Diagnostica la configuración de WhatsApp y muestra qué falta';

    public function handle(): int
    {
        $this->info('=== Diagnóstico de WhatsApp ===');
        $this->newLine();

        // 1. Variables de entorno
        $this->info('1. Variables de entorno en Render:');
        $checks = [
            'WHATSAPP_TOKEN'              => env('WHATSAPP_TOKEN'),
            'WHATSAPP_PHONE_NUMBER_ID'    => env('WHATSAPP_PHONE_NUMBER_ID'),
            'WHATSAPP_BUSINESS_ACCOUNT_ID'=> env('WHATSAPP_BUSINESS_ACCOUNT_ID'),
            'WHATSAPP_WEBHOOK_VERIFY_TOKEN'=> env('WHATSAPP_WEBHOOK_VERIFY_TOKEN'),
            'LLM_API_KEY'                 => env('LLM_API_KEY'),
            'LLM_BASE_URL'                => env('LLM_BASE_URL'),
        ];

        foreach ($checks as $key => $value) {
            $status = $value ? '✅ OK' : '❌ FALTA';
            $display = $value ? substr($value, 0, 10).'...' : 'NO CONFIGURADO';
            $this->line("   {$key}: {$status} ({$display})");
        }

        // 2. Config de tenants
        $this->newLine();
        $this->info('2. Configuración de tenants:');
        $tenants = Tenant::all(['id', 'name', 'phone', 'whatsapp_phone_number_id']);
        if ($tenants->isEmpty()) {
            $this->warn('   No hay tenants registrados.');
        } else {
            foreach ($tenants as $tenant) {
                $hasPhone = $tenant->whatsapp_phone_number_id ? '✅' : '❌';
                $this->line("   {$hasPhone} {$tenant->name} (ID: {$tenant->id}) — phone_number_id: ".($tenant->whatsapp_phone_number_id ?? 'NO CONFIGURADO'));
            }
        }

        // 3. URL del webhook
        $appUrl = config('app.url');
        $webhookUrl = rtrim($appUrl, '/').'/api/webhooks/whatsapp/inbound';
        $this->newLine();
        $this->info('3. URL del webhook para configurar en Meta:');
        $this->line("   {$webhookUrl}");

        // 4. Verificar token con Meta (si está configurado)
        $token = env('WHATSAPP_TOKEN');
        $phoneId = env('WHATSAPP_PHONE_NUMBER_ID');

        if ($token && $phoneId) {
            $this->newLine();
            $this->info('4. Verificando conexión con Meta API...');
            try {
                $response = Http::withToken($token)
                    ->timeout(10)
                    ->get("https://graph.facebook.com/v19.0/{$phoneId}");

                if ($response->successful()) {
                    $this->info('   ✅ Conexión exitosa con Meta WhatsApp API');
                    $data = $response->json();
                    $this->line("   Display Name: ".($data['display_phone_number'] ?? 'N/A'));
                    $this->line("   Quality Rating: ".($data['quality_rating'] ?? 'N/A'));
                } else {
                    $this->error('   ❌ Error conectando con Meta: '.($response->json('error.message') ?? 'Unknown'));
                }
            } catch (\Throwable $e) {
                $this->error('   ❌ Error de red: '.$e->getMessage());
            }
        } else {
            $this->newLine();
            $this->warn('4. No se puede verificar conexión con Meta: falta WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID');
        }

        // 5. Próximos pasos
        $this->newLine();
        $this->info('5. Próximos pasos:');
        $steps = [
            'Configurar las variables de entorno en Render (web + worker)',
            'Guardar whatsapp_phone_number_id en cada tenant (clínica)',
            'Configurar el webhook en Meta Developers con la URL de arriba',
            'Verificar que el worker de Render esté activo (procesa la cola)',
        ];
        foreach ($steps as $i => $step) {
            $this->line("   ".($i + 1).". {$step}");
        }

        return self::SUCCESS;
    }
}
