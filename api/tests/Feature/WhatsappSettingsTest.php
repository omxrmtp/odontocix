<?php

namespace Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\CreatesTenant;
use Tests\TestCase;

class WhatsappSettingsTest extends TestCase
{
    use RefreshDatabase, CreatesTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();
    }

    public function test_show_returns_masked_values_and_no_secrets(): void
    {
        $this->tenant->update([
            'whatsapp_phone_number_id' => '123456789',
            'whatsapp_business_account_id' => '987654321',
            'whatsapp_access_token' => 'EAASecretToken1234567890',
            'whatsapp_app_secret' => 'app-secret-abc123',
            'whatsapp_webhook_verify_token' => 'verify-token-xyz',
            'whatsapp_enabled' => true,
        ]);

        $response = $this->getJson('/api/settings/whatsapp', $this->authHeaders());

        $response->assertOk()
            ->assertJson([
                'phone_number_id' => '123456789',
                'business_account_id' => '987654321',
                'enabled' => true,
                'has_access_token' => true,
                'has_app_secret' => true,
                'has_webhook_verify_token' => true,
                'access_token_last4' => '••••7890',
            ]);

        $json = $response->json();
        $this->assertStringNotContainsString('EAASecretToken1234567890', json_encode($json));
        $this->assertStringNotContainsString('app-secret-abc123', json_encode($json));
        $this->assertStringNotContainsString('verify-token-xyz', json_encode($json));
    }

    public function test_show_returns_empty_state_when_not_configured(): void
    {
        $response = $this->getJson('/api/settings/whatsapp', $this->authHeaders());

        $response->assertOk()
            ->assertJson([
                'phone_number_id' => null,
                'business_account_id' => null,
                'enabled' => false,
                'has_access_token' => false,
                'has_app_secret' => false,
                'has_webhook_verify_token' => false,
                'access_token_last4' => null,
            ]);
    }

    public function test_update_stores_settings_encrypted(): void
    {
        $response = $this->putJson('/api/settings/whatsapp', [
            'phone_number_id' => '555000111',
            'business_account_id' => '555000222',
            'access_token' => 'EAATokenSuperSecreto',
            'app_secret' => 'my-app-secret',
            'webhook_verify_token' => 'my-verify-token',
            'enabled' => true,
        ], $this->authHeaders());

        $response->assertOk();

        $this->tenant->refresh();
        $this->assertSame('555000111', $this->tenant->whatsapp_phone_number_id);
        $this->assertSame('555000222', $this->tenant->whatsapp_business_account_id);
        $this->assertSame('EAATokenSuperSecreto', $this->tenant->whatsapp_access_token);
        $this->assertSame('my-app-secret', $this->tenant->whatsapp_app_secret);
        $this->assertSame('my-verify-token', $this->tenant->whatsapp_webhook_verify_token);
        $this->assertTrue($this->tenant->whatsapp_enabled);
    }

    public function test_update_with_empty_fields_keeps_existing_values(): void
    {
        $this->tenant->update([
            'whatsapp_phone_number_id' => '111222333',
            'whatsapp_access_token' => 'token-existente',
        ]);

        $response = $this->putJson('/api/settings/whatsapp', [
            'phone_number_id' => '',
            'access_token' => '',
            'business_account_id' => '444555666',
        ], $this->authHeaders());

        $response->assertOk();

        $this->tenant->refresh();
        $this->assertSame('111222333', $this->tenant->whatsapp_phone_number_id);
        $this->assertSame('token-existente', $this->tenant->whatsapp_access_token);
        $this->assertSame('444555666', $this->tenant->whatsapp_business_account_id);
    }

    public function test_update_requires_configuracion_editar_permission(): void
    {
        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'Recepcionista', 'guard_name' => 'web']);
        $this->user->syncRoles($role);

        $response = $this->putJson('/api/settings/whatsapp', [
            'access_token' => 'nuevo-token',
        ], $this->authHeaders());

        $response->assertForbidden();
    }
}
