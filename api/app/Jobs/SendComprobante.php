<?php

namespace App\Jobs;

use App\Models\Comprobante;
use App\Services\ComprobanteService;
use App\Services\TenantService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendComprobante implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 90;

    public array $backoff = [30, 120];

    public function __construct(
        private int $comprobanteId,
    ) {}

    public function handle(ComprobanteService $service): void
    {
        $comprobante = Comprobante::find($this->comprobanteId);

        if (! $comprobante) {
            Log::warning('Comprobante not found', ['id' => $this->comprobanteId]);

            return;
        }

        if (! $comprobante->tenant) {
            Log::warning('Comprobante sin tenant', ['id' => $comprobante->id]);

            return;
        }

        app(TenantService::class)->setCurrent($comprobante->tenant);

        try {
            $service->send($comprobante);

            Log::info('Comprobante enviado a SUNAT', [
                'id' => $comprobante->id,
                'serie' => $comprobante->serie.'-'.$comprobante->correlativo,
                'estado' => $comprobante->estado,
                'cdr_code' => $comprobante->cdr_code,
                'cdr_desc' => $comprobante->cdr_description,
            ]);
        } catch (\Throwable $e) {
            $comprobante->update([
                'estado' => Comprobante::ESTADO_ERROR,
                'error_code' => 'JOB',
                'error_message' => substr($e->getMessage(), 0, 500),
            ]);

            Log::error('Comprobante falló al enviar', [
                'id' => $comprobante->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
