<?php

namespace Tests\Feature;

use App\Jobs\SendWhatsappMessage;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\WhatsappSession;
use App\Services\LlmService;
use App\Services\WhatsappProviderInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\CreatesTenant;
use Tests\TestCase;

class WhatsappIntegrationTest extends TestCase
{
    use RefreshDatabase, CreatesTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();
    }

    public function test_webhook_verification_returns_challenge(): void
    {
        $this->tenant->update(['whatsapp_phone_number_id' => '123456789']);

        $response = $this->getJson('/api/webhooks/whatsapp/inbound?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=12345');

        $response->assertOk();
        $this->assertEquals(12345, $response->json());
    }

    public function test_webhook_verification_fails_with_wrong_token(): void
    {
        $response = $this->getJson('/api/webhooks/whatsapp/inbound?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345');

        $response->assertForbidden();
    }

    public function test_webhook_receives_message_and_creates_session(): void
    {
        $this->tenant->update(['whatsapp_phone_number_id' => '123456789']);

        $mockProvider = $this->createMock(WhatsappProviderInterface::class);
        $mockProvider->expects($this->once())
            ->method('sendText')
            ->with($this->stringContains('51999999999'), $this->stringContains('OdontoCix'));

        $mockLlm = $this->createMock(LlmService::class);
        $mockLlm->method('chat')->willReturn([
            'action' => 'greeting',
            'data'   => ['message' => '¡Hola! Soy el asistente de OdontoCix.'],
        ]);

        $this->app->instance(WhatsappProviderInterface::class, $mockProvider);
        $this->app->instance(LlmService::class, $mockLlm);

        $payload = [
            'entry' => [[
                'changes' => [[
                    'value' => [
                        'metadata' => ['phone_number_id' => '123456789'],
                        'messages' => [[
                            'from' => '51999999999',
                            'id'   => 'msg_1',
                            'type' => 'text',
                            'text' => ['body' => 'Hola'],
                        ]],
                    ],
                ]],
            ]],
        ];

        $response = $this->postJson('/api/webhooks/whatsapp/inbound', $payload);

        $response->assertOk();

        $this->assertDatabaseHas('whatsapp_sessions', [
            'tenant_id' => $this->tenant->id,
            'phone'     => '51999999999',
        ]);
    }

    public function test_reminders_command_dispatches_real_messages(): void
    {
        Bus::fake([SendWhatsappMessage::class]);

        $patient = Patient::factory()->create([
            'tenant_id' => $this->tenant->id,
            'phone'     => '999999999',
        ]);
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);

        \App\Models\Appointment::factory()->create([
            'tenant_id'    => $this->tenant->id,
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'start_date'   => now()->addHours(30),
            'end_date'     => now()->addHours(31),
            'status'       => 'scheduled',
            'whatsapp_patient_sent' => false,
        ]);

        $this->artisan('reminders:send')
            ->assertSuccessful();

        Bus::assertDispatched(SendWhatsappMessage::class);
    }
}
