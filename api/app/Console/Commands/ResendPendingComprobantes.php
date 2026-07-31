<?php

namespace App\Console\Commands;

use App\Jobs\SendComprobante;
use App\Models\Comprobante;
use App\Services\TenantService;
use Illuminate\Console\Command;

class ResendPendingComprobantes extends Command
{
    protected $signature = 'sunat:resend-pending';

    protected $description = 'Reencola comprobantes pendientes o en error hacia SUNAT';

    public function __construct(private TenantService $tenantService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $pending = Comprobante::withoutGlobalScopes()
            ->whereIn('estado', [Comprobante::ESTADO_PENDIENTE, Comprobante::ESTADO_ERROR])
            ->with('tenant')
            ->get();

        if ($pending->isEmpty()) {
            $this->info('No hay comprobantes pendientes por reenviar.');

            return self::SUCCESS;
        }

        $count = 0;
        foreach ($pending as $comprobante) {
            $tenant = $comprobante->tenant;
            if (! $tenant) {
                continue;
            }

            $this->tenantService->setCurrent($tenant);

            SendComprobante::dispatch($comprobante->id);
            $count++;
        }

        $this->info("Se reencolaron {$count} comprobantes.");

        return self::SUCCESS;
    }
}
