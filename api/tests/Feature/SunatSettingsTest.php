<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\CreatesTenant;
use Tests\TestCase;

class SunatSettingsTest extends TestCase
{
    use CreatesTenant, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();
    }

    public function test_show_returns_masked_values_and_no_secrets(): void
    {
        $this->tenant->update([
            'ruc' => '20123456789',
            'sunat_enabled' => true,
            'sunat_environment' => 'beta',
            'sunat_certificate' => 'BASE64PFXCONTENT',
            'sunat_certificate_password' => 'secret-password',
            'sunat_certificate_name' => 'certificado.pfx',
            'sunat_sol_user' => 'MODDATOS',
            'sunat_sol_password' => 'moddatos',
            'sunat_serie_boleta' => 'B001',
            'sunat_serie_factura' => 'F001',
            'sunat_correlative_boleta' => 3,
            'sunat_correlative_factura' => 7,
        ]);

        $response = $this->getJson('/api/settings/sunat', $this->authHeaders());

        $response->assertOk()
            ->assertJson([
                'ruc' => '20123456789',
                'enabled' => true,
                'environment' => 'beta',
                'serie_boleta' => 'B001',
                'serie_factura' => 'F001',
                'correlative_boleta' => 3,
                'correlative_factura' => 7,
                'has_certificate' => true,
                'certificate_name' => 'certificado.pfx',
                'has_certificate_password' => true,
                'has_sol_user' => true,
                'has_sol_password' => true,
            ]);

        $json = $response->json();
        $this->assertStringNotContainsString('BASE64PFXCONTENT', json_encode($json));
        $this->assertStringNotContainsString('secret-password', json_encode($json));
        $this->assertStringNotContainsString('moddatos', json_encode($json));
    }

    public function test_show_returns_empty_state_when_not_configured(): void
    {
        $response = $this->getJson('/api/settings/sunat', $this->authHeaders());

        $response->assertOk()
            ->assertJson([
                'enabled' => false,
                'environment' => 'beta',
                'serie_boleta' => 'B001',
                'serie_factura' => 'F001',
                'correlative_boleta' => 0,
                'correlative_factura' => 0,
                'has_certificate' => false,
                'has_certificate_password' => false,
                'has_sol_user' => false,
                'has_sol_password' => false,
            ]);
    }

    public function test_update_stores_settings_encrypted(): void
    {
        $response = $this->putJson('/api/settings/sunat', [
            'enabled' => true,
            'environment' => 'produccion',
            'certificate' => 'BASE64PFXNEW',
            'certificate_password' => 'new-pass',
            'certificate_name' => 'cert-prod.pfx',
            'sol_user' => 'USUARIOSOL',
            'sol_password' => 'clavesol123',
            'serie_boleta' => 'B002',
            'serie_factura' => 'F002',
        ], $this->authHeaders());

        $response->assertOk();

        $this->tenant->refresh();
        $this->assertTrue($this->tenant->sunat_enabled);
        $this->assertSame('produccion', $this->tenant->sunat_environment);
        $this->assertSame('BASE64PFXNEW', $this->tenant->sunat_certificate);
        $this->assertSame('new-pass', $this->tenant->sunat_certificate_password);
        $this->assertSame('cert-prod.pfx', $this->tenant->sunat_certificate_name);
        $this->assertSame('USUARIOSOL', $this->tenant->sunat_sol_user);
        $this->assertSame('clavesol123', $this->tenant->sunat_sol_password);
        $this->assertSame('B002', $this->tenant->sunat_serie_boleta);
        $this->assertSame('F002', $this->tenant->sunat_serie_factura);
    }

    public function test_update_with_empty_fields_keeps_existing_values(): void
    {
        $this->tenant->update([
            'sunat_certificate' => 'EXISTINGPFX',
            'sunat_certificate_password' => 'existing-pass',
            'sunat_sol_user' => 'SOLUSER',
            'sunat_sol_password' => 'solpass',
        ]);

        $response = $this->putJson('/api/settings/sunat', [
            'certificate' => '',
            'certificate_password' => '',
            'sol_user' => '',
            'sol_password' => '',
            'environment' => 'beta',
        ], $this->authHeaders());

        $response->assertOk();

        $this->tenant->refresh();
        $this->assertSame('EXISTINGPFX', $this->tenant->sunat_certificate);
        $this->assertSame('existing-pass', $this->tenant->sunat_certificate_password);
        $this->assertSame('SOLUSER', $this->tenant->sunat_sol_user);
        $this->assertSame('solpass', $this->tenant->sunat_sol_password);
    }

    public function test_update_rejects_invalid_environment(): void
    {
        $response = $this->putJson('/api/settings/sunat', [
            'environment' => 'nube',
        ], $this->authHeaders());

        $response->assertStatus(422)
            ->assertJsonValidationErrors('environment');
    }

    public function test_update_requires_configuracion_editar_permission(): void
    {
        $role = Role::firstOrCreate(['name' => 'Recepcionista', 'guard_name' => 'web']);
        $this->user->syncRoles($role);

        $response = $this->putJson('/api/settings/sunat', [
            'environment' => 'beta',
        ], $this->authHeaders());

        $response->assertForbidden();
    }

    public function test_connection_fails_without_certificate(): void
    {
        $response = $this->postJson('/api/settings/sunat/test', [], $this->authHeaders());

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Primero sube el certificado digital (.pfx) para poder probar la conexión.');
    }

    public function test_connection_succeeds_with_valid_certificate(): void
    {
        $pfx = $this->generateTestPfx('secret123');

        $this->tenant->update([
            'ruc' => '20123456789',
            'sunat_certificate' => $pfx,
            'sunat_certificate_password' => 'secret123',
            'sunat_environment' => 'beta',
        ]);

        $response = $this->postJson('/api/settings/sunat/test', [], $this->authHeaders());

        $response->assertOk()
            ->assertJsonPath('message', 'Conexión correcta: certificado válido y firma digital generada.')
            ->assertJsonPath('certificate.name', '/C=PE/O=DentalClinic SAC/CN=DentalClinic SAC');
    }

    public function test_connection_fails_with_wrong_certificate_password(): void
    {
        $pfx = $this->generateTestPfx('correct-pass');

        $this->tenant->update([
            'ruc' => '20123456789',
            'sunat_certificate' => $pfx,
            'sunat_certificate_password' => 'wrong-pass',
            'sunat_environment' => 'beta',
        ]);

        $response = $this->postJson('/api/settings/sunat/test', [], $this->authHeaders());

        $response->assertStatus(422);
        $this->assertStringStartsWith('Error de conexión: ', $response->json('message'));
    }

    private function generateTestPfx(string $password): string
    {
        $dn = [
            'countryName' => 'PE',
            'organizationName' => 'DentalClinic SAC',
            'commonName' => 'DentalClinic SAC',
        ];

        $privKey = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        $csr = openssl_csr_new($dn, $privKey, ['digest_alg' => 'sha256']);
        $cert = openssl_csr_sign($csr, null, $privKey, 365, ['digest_alg' => 'sha256']);

        openssl_pkcs12_export($cert, $pfx, $privKey, $password);

        return $pfx;
    }
}
