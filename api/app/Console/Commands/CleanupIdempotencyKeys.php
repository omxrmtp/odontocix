<?php

namespace App\Console\Commands;

use App\Services\IdempotencyService;
use Illuminate\Console\Command;

class CleanupIdempotencyKeys extends Command
{
    protected $signature = 'idempotency:cleanup';

    protected $description = 'Elimina claves de idempotencia expiradas';

    public function __construct(private IdempotencyService $service)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $deleted = $this->service->cleanup();
        $this->info("{$deleted} claves de idempotencia eliminadas.");

        return self::SUCCESS;
    }
}
