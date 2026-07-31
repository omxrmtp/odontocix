<?php

namespace App\Jobs;

use App\Models\WhatsappOutbox;
use App\Services\WhatsappProviderInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendWhatsappMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 60;

    public function __construct(
        private string $tenantId,
        private ?int $appointmentId,
        private string $recipientPhone,
        private string $recipientType,
        private string $messageTemplate,
        private string $message,
        private bool $useTemplate = false,
        private array $templateParams = [],
    ) {}

    public function handle(WhatsappProviderInterface $whatsapp): void
    {
        try {
            if ($this->useTemplate) {
                $result = $whatsapp->sendTemplate($this->recipientPhone, $this->messageTemplate, $this->templateParams);
            } else {
                $result = $whatsapp->sendText($this->recipientPhone, $this->message);
            }

            WhatsappOutbox::create([
                'tenant_id'        => $this->tenantId,
                'appointment_id'   => $this->appointmentId,
                'recipient_phone'  => $this->recipientPhone,
                'recipient_type'   => $this->recipientType,
                'message_template' => $this->messageTemplate,
                'message'          => $this->message,
                'status'           => 'sent',
                'sent_at'          => now(),
            ]);

            Log::info('WhatsApp message sent', [
                'recipient' => $this->recipientPhone,
                'template'  => $this->messageTemplate,
                'result'    => $result['messages'][0]['id'] ?? 'ok',
            ]);
        } catch (\Throwable $e) {
            WhatsappOutbox::create([
                'tenant_id'        => $this->tenantId,
                'appointment_id'   => $this->appointmentId,
                'recipient_phone'  => $this->recipientPhone,
                'recipient_type'   => $this->recipientType,
                'message_template' => $this->messageTemplate,
                'message'          => $this->message,
                'status'           => 'failed',
            ]);

            Log::error('WhatsApp message failed', [
                'recipient' => $this->recipientPhone,
                'error'     => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
