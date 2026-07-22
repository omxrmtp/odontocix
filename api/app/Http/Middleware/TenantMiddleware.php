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
        $tenantId = $request->header('X-Tenant-Id')
            ?? $request->input('tenant_id');

        if ($tenantId) {
            $tenant = Tenant::find($tenantId);
            if ($tenant) {
                $this->tenantService->setCurrent($tenant);
                $request->merge(['tenant_id' => $tenantId]);

                if (class_exists('tenancy') && !tenancy()->initialized) {
                    $request->attributes->set('_tenant_initialized', true);
                    tenancy()->initialize($tenant);
                }
            } else {
                \Log::warning('TenantMiddleware: tenant_id provided but not found', ['tenant_id' => $tenantId, 'uri' => $request->path()]);
            }
        }

        return $next($request);
    }
}
