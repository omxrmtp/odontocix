<?php

namespace Tests\Feature;

use Tests\CreatesTenant;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ProfileTest extends TestCase
{
    use RefreshDatabase, CreatesTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();
    }

    public function test_can_get_profile(): void
    {
        $response = $this->getJson('/api/profile', $this->authHeaders());

        $response->assertOk()
            ->assertJsonStructure(['user', 'tenant']);
    }

    public function test_can_update_profile(): void
    {
        $response = $this->putJson('/api/profile', [
            'name' => 'New Name',
            'email' => 'new@example.com',
        ], $this->authHeaders());

        $response->assertOk();
        $this->assertEquals('New Name', $this->user->fresh()->name);
    }

    public function test_can_update_password(): void
    {
        $this->user->update(['password' => bcrypt('current_pass')]);

        $response = $this->putJson('/api/profile/password', [
            'current_password' => 'current_pass',
            'password' => 'new_password123',
            'password_confirmation' => 'new_password123',
        ], $this->authHeaders());

        $response->assertOk();
    }

    public function test_can_get_tenant(): void
    {
        $response = $this->getJson('/api/tenant', $this->authHeaders());

        $response->assertOk()
            ->assertJson(['name' => $this->tenant->name]);
    }

    public function test_can_update_tenant(): void
    {
        $response = $this->putJson('/api/tenant', [
            'name' => 'Updated Clinic',
            'ruc' => '12345678901',
            'phone' => '999888777',
            'address' => 'New Address 123',
            'email' => 'clinic@example.com',
        ], $this->authHeaders());

        $response->assertOk();
        $this->assertEquals('Updated Clinic', $this->tenant->fresh()->name);
    }
}
