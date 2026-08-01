<?php

namespace App\Services;

use App\Jobs\SendWhatsappMessage;
use App\Models\Appointment;

class WhatsappService
{
    public function __construct(private WhatsappProviderInterface $provider) {}

    public function generatePatientReminder(Appointment $appointment): object
    {
        $patient = $appointment->patient;
        $doctor = $appointment->doctor;

        $message = sprintf(
            'Hola %s, le recordamos su cita el %s a las %s con el Dr. %s. Motivo: %s.',
            explode(' ', $patient->first_name)[0],
            $appointment->start_date->format('d/m/Y'),
            $appointment->start_date->format('H:i'),
            $doctor?->first_last_name ?? 'Asignado',
            $appointment->reason ?? 'consulta',
        );

        $url = 'https://wa.me/51'.preg_replace('/[^0-9]/', '', $patient->phone).'?text='.urlencode($message);

        return (object) ['url' => $url, 'message' => $message];
    }

    public function generateDoctorReminder(Appointment $appointment): object
    {
        $patient = $appointment->patient;
        $doctor = $appointment->doctor;

        if (! $doctor) {
            return (object) ['url' => '#', 'message' => ''];
        }

        $message = sprintf(
            'Dr. %s, tiene cita con %s %s el %s a las %s. Motivo: %s.',
            $doctor->first_last_name,
            $patient->first_name,
            $patient->first_last_name,
            $appointment->start_date->format('d/m/Y'),
            $appointment->start_date->format('H:i'),
            $appointment->reason ?? 'consulta',
        );

        $url = 'https://wa.me/51'.preg_replace('/[^0-9]/', '', $doctor->phone).'?text='.urlencode($message);

        return (object) ['url' => $url, 'message' => $message];
    }

    public function generatePatientLink(Appointment $appointment): string
    {
        return $this->generatePatientReminder($appointment)->url;
    }

    public function generateDoctorLink(Appointment $appointment): string
    {
        return $this->generateDoctorReminder($appointment)->url;
    }

    /**
     * Encolar envío real de recordatorio al paciente vía Meta API.
     */
    public function queuePatientReminder(Appointment $appointment): void
    {
        $reminder = $this->generatePatientReminder($appointment);

        SendWhatsappMessage::dispatch(
            tenantId: $appointment->tenant_id,
            appointmentId: $appointment->id,
            recipientPhone: $appointment->patient->phone,
            recipientType: 'patient',
            messageTemplate: 'appointment_reminder',
            message: $reminder->message,
        );
    }

    /**
     * Enviar mensaje de texto directo (para el bot).
     */
    public function sendText(string $to, string $message): void
    {
        if (TenantService::isDemo()) {
            return;
        }

        $this->provider->sendText($to, $message);
    }
}
