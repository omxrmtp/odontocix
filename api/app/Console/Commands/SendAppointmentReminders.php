<?php

namespace App\Console\Commands;

use App\Mail\AppointmentReminderMail;
use App\Models\Appointment;
use App\Services\WhatsappService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendAppointmentReminders extends Command
{
    protected $signature = 'reminders:send';

    protected $description = 'Send automatic appointment reminders (WhatsApp + email) for appointments in the next 24-48h';

    public function __construct(private WhatsappService $whatsapp)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $now = now();
        $from = $now->copy()->addHours(24);
        $to = $now->copy()->addHours(48);

        $appointments = Appointment::whereBetween('start_date', [$from, $to])
            ->where('whatsapp_patient_sent', false)
            ->whereIn('status', ['scheduled', 'confirmed'])
            ->with(['patient', 'doctor'])
            ->get();

        if ($appointments->isEmpty()) {
            $this->info('No hay citas pendientes de recordatorio entre ' . $from->format('d/m/Y H:i') . ' y ' . $to->format('d/m/Y H:i'));
            return self::SUCCESS;
        }

        $sentCount = 0;
        $emailCount = 0;

        foreach ($appointments as $appointment) {
            $patient = $appointment->patient;
            $doctor = $appointment->doctor;

            if (! $patient) {
                $this->warn("Cita {$appointment->id}: paciente no encontrado. Saltando.");
                continue;
            }

            $reminder = $this->whatsapp->generatePatientReminder($appointment);

            $appointment->update(['whatsapp_patient_sent' => true]);

            $this->info("Cita {$appointment->id}: recordatorio WhatsApp generado para {$patient->first_name} {$patient->first_last_name} ({$reminder->url})");
            Log::info("Recordatorio WhatsApp generado", [
                'appointment_id' => $appointment->id,
                'patient_id' => $patient->id,
                'url' => $reminder->url,
            ]);

            if ($patient->email) {
                try {
                    Mail::to($patient->email)->send(new AppointmentReminderMail($appointment, $reminder->message));
                    $this->info("Cita {$appointment->id}: email enviado a {$patient->email}");
                    $emailCount++;
                } catch (\Exception $e) {
                    $this->warn("Cita {$appointment->id}: fallo al enviar email: {$e->getMessage()}");
                    Log::error("Fallo al enviar email de recordatorio", [
                        'appointment_id' => $appointment->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $sentCount++;
        }

        $this->info("Proceso completado. Recordatorios procesados: {$sentCount}. Emails enviados: {$emailCount}.");

        return self::SUCCESS;
    }
}
