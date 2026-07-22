<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Doctor;

class WhatsappService
{
    public function generatePatientReminder(Appointment $appointment): object
    {
        $patient = $appointment->patient;
        $doctor = $appointment->doctor;

        $message = sprintf(
            "Hola %s, le recordamos su cita el %s a las %s con el Dr. %s. Motivo: %s.",
            explode(' ', $patient->first_name)[0],
            $appointment->start_date->format('d/m/Y'),
            $appointment->start_date->format('H:i'),
            $doctor?->first_last_name ?? 'Asignado',
            $appointment->reason ?? 'consulta',
        );

        $url = 'https://wa.me/51' . preg_replace('/[^0-9]/', '', $patient->phone) . '?text=' . urlencode($message);

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
            "Dr. %s, tiene cita con %s %s el %s a las %s. Motivo: %s.",
            $doctor->first_last_name,
            $patient->first_name,
            $patient->first_last_name,
            $appointment->start_date->format('d/m/Y'),
            $appointment->start_date->format('H:i'),
            $appointment->reason ?? 'consulta',
        );

        $url = 'https://wa.me/51' . preg_replace('/[^0-9]/', '', $doctor->phone) . '?text=' . urlencode($message);

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
}
