<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;
use Tests\CreatesTenant;
use Tests\TestCase;

class DemoModeTest extends TestCase
{
    use CreatesTenant, RefreshDatabase;

    protected Tenant $demoTenant;

    protected User $demoUser;

    protected string $demoToken;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();

        Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);

        $this->demoTenant = Tenant::factory()->create(['is_demo' => true]);

        $this->demoUser = User::factory()->create([
            'email' => 'demo@odontocix.com',
            'tenant_id' => $this->demoTenant->id,
        ]);
        $this->demoUser->assignRole('Super Admin');

        $this->demoToken = $this->demoUser->createToken('test')->plainTextToken;
    }

    private function demoHeaders(): array
    {
        return [
            'Authorization' => 'Bearer '.$this->demoToken,
            'Accept' => 'application/json',
        ];
    }

    public function test_demo_login_returns_is_demo_true(): void
    {
        $response = $this->postJson('/api/auth/demo-login');

        $response->assertOk()
            ->assertJson([
                'is_demo' => true,
                'email' => 'demo@odontocix.com',
            ])
            ->assertJsonStructure(['token']);
    }

    public function test_regular_login_returns_is_demo_false(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => $this->user->email,
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJson(['is_demo' => false]);
    }

    public function test_user_endpoint_returns_is_demo_for_demo_user(): void
    {
        $response = $this->getJson('/api/user', $this->demoHeaders());

        $response->assertOk()
            ->assertJson(['is_demo' => true]);
    }

    public function test_demo_writes_are_rolled_back_after_request(): void
    {
        $data = Patient::factory()->make(['tenant_id' => $this->demoTenant->id])->toArray();

        $response = $this->postJson('/api/patients', $data, $this->demoHeaders());

        $response->assertCreated();

        $this->assertSame(0, Patient::where('tenant_id', $this->demoTenant->id)->count());
        $this->assertSame(0, AuditLog::where('tenant_id', $this->demoTenant->id)->count());
    }

    public function test_non_demo_user_writes_persist(): void
    {
        $data = Patient::factory()->make(['tenant_id' => $this->tenant->id])->toArray();

        $response = $this->postJson('/api/patients', $data, $this->authHeaders());

        $response->assertCreated();
        $this->assertSame(1, Patient::where('tenant_id', $this->tenant->id)->count());
    }

    public function test_demo_reads_are_scoped_to_demo_tenant(): void
    {
        app(TenantService::class)->setCurrent($this->demoTenant);
        Patient::factory()->count(2)->create();

        app(TenantService::class)->setCurrent($this->tenant);
        Patient::factory()->count(3)->create();

        $response = $this->getJson('/api/patients', $this->demoHeaders());

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    public function test_sunat_test_returns_simulated_success_in_demo(): void
    {
        $response = $this->postJson('/api/settings/sunat/test', [], $this->demoHeaders());

        $response->assertOk()
            ->assertJsonPath('certificate.name', 'demo-cert.pfx')
            ->assertJsonPath('message', 'Modo demo: conexión simulada con SUNAT (no se enviaron datos).');
    }

    public function test_reminders_command_skips_demo_tenant(): void
    {
        Mail::fake();
        Queue::fake();

        app(TenantService::class)->setCurrent($this->demoTenant);
        $patient = Patient::factory()->create();
        Appointment::factory()->create([
            'patient_id' => $patient->id,
            'start_date' => now()->addHours(36),
            'end_date' => now()->addHours(36)->addMinutes(30),
            'status' => 'confirmed',
            'whatsapp_patient_sent' => false,
        ]);

        app(TenantService::class)->setCurrent(null);

        $this->artisan('reminders:send')->assertSuccessful();

        Queue::assertNothingPushed();
        Mail::assertNothingSent();
    }

    public function test_tenant_service_is_demo_flag(): void
    {
        app(TenantService::class)->setCurrent($this->demoTenant);
        $this->assertTrue(TenantService::isDemo());

        app(TenantService::class)->setCurrent($this->tenant);
        $this->assertFalse(TenantService::isDemo());
    }
}
