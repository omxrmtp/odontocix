<?php

namespace Tests;

use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantService;
use Illuminate\Support\Facades\App;
use Spatie\Permission\Models\Role;

trait CreatesTenant
{
    protected Tenant $tenant;
    protected User $user;
    protected string $token;

    protected function setUpTenant(): void
    {
        $this->tenant = Tenant::factory()->create();

        App::make(TenantService::class)->setCurrent($this->tenant);

        $this->user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);

        Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $this->user->assignRole('Super Admin');

        $this->token = $this->user->createToken('test')->plainTextToken;
    }

    protected function authHeaders(): array
    {
        return [
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ];
    }
}
