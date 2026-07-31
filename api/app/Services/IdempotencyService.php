<?php

namespace App\Services;

use App\Models\IdempotencyKey;
use Carbon\Carbon;
use Illuminate\Http\Request;

class IdempotencyService
{
    public function get(string $key, string $tenantId, string $resourceType): ?IdempotencyKey
    {
        return IdempotencyKey::where('key', $key)
            ->where('tenant_id', $tenantId)
            ->where('resource_type', $resourceType)
            ->first();
    }

    public function start(string $key, string $tenantId, string $resourceType, array $payload): IdempotencyKey
    {
        return IdempotencyKey::create([
            'key'             => $key,
            'tenant_id'       => $tenantId,
            'resource_type'   => $resourceType,
            'status'          => 'processing',
            'request_payload' => $payload,
            'expires_at'      => Carbon::now()->addMinutes(30),
        ]);
    }

    public function complete(IdempotencyKey $record, array $response): void
    {
        $record->update([
            'status'           => 'completed',
            'response_payload' => $response,
        ]);
    }

    public function fail(IdempotencyKey $record, array $response): void
    {
        $record->update([
            'status'           => 'failed',
            'response_payload' => $response,
        ]);
    }

    public function cleanup(): int
    {
        return IdempotencyKey::where('expires_at', '<', Carbon::now())->delete();
    }
}
