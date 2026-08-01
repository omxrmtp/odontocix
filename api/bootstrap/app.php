<?php

use App\Http\Middleware\DemoMiddleware;
use App\Http\Middleware\EnsureTokenAbility;
use App\Http\Middleware\IdempotencyMiddleware;
use App\Http\Middleware\TenantMiddleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            TenantMiddleware::class,
            DemoMiddleware::class,
        ]);

        $middleware->alias([
            'tenant' => TenantMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role' => RoleMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'ability' => EnsureTokenAbility::class,
            'idempotency' => IdempotencyMiddleware::class,
        ]);

        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        });

        $exceptions->render(function (RuntimeException $e, Request $request) {
            if ($request->is('api/*') && str_contains($e->getMessage(), 'No se encontró un tenant activo')) {
                return response()->json(['message' => $e->getMessage()], 400);
            }
        });
    })
    ->create();
