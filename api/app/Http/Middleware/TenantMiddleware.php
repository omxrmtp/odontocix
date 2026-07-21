<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Services\TenantService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantMiddleware
{
    public function __construct(private TenantService $tenantService) {}

    public function handle(Request $request, Closure $next): Response
    {
        $tenantId = $request->header('X-Tenant-Id');

        if ($tenantId && $tenant = Tenant::find($tenantId)) {
            $this->tenantService->setCurrent($tenant);
            $request->merge(['tenant_id' => $tenant->id]);
        }

        return $next($request);
    }
}
