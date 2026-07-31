<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Services\TenantService::class);

        $this->app->singleton(\App\Services\WhatsappProviderInterface::class, function () {
            return match (config('whatsapp.provider', 'meta')) {
                'meta' => new \App\Services\MetaWhatsappProvider(),
                default => new \App\Services\MetaWhatsappProvider(),
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('automation', function ($request) {
            return Limit::perMinute(60)->by(
                $request->user()?->id ?? $request->ip()
            );
        });
    }
}
