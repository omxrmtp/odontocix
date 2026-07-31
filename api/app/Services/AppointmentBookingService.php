<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AvailableSlot;
use App\Models\Doctor;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AppointmentBookingService
{
    /**
     * Buscar o crear paciente por DNI.
     */
    public function upsertPatient(array $data): Patient
    {
        $dni = $data['dni'] ?? null;
        if (! $dni) {
            throw ValidationException::withMessages(['dni' => ['El DNI es requerido para identificar al paciente.']]);
        }

        $patient = Patient::where('dni', $dni)->first();

        if (! $patient) {
            $patient = Patient::create($data + [
                'portal_token' => \Illuminate\Support\Str::random(32),
                'reniec_cached_at' => now(),
            ]);
        }

        return $patient;
    }

    /**
     * Reservar una cita usando un slot existente.
     * Extraido de OnlineBookingController::book para reutilizar.
     */
    public function bookBySlot(int $slotId, array $patientData, ?string $reason = null): array
    {
        $slot = AvailableSlot::where('id', $slotId)
            ->where('is_available', true)
            ->where('is_booked', false)
            ->lockForUpdate()
            ->first();

        if (! $slot) {
            throw ValidationException::withMessages([
                'slot_id' => ['El horario seleccionado ya no está disponible.'],
            ]);
        }

        $patient = $this->upsertPatient($patientData);

        $appointment = DB::transaction(function () use ($slot, $patient, $reason) {
            $startDate = Carbon::parse($slot->date->format('Y-m-d') . ' ' . Carbon::parse($slot->start_time)->format('H:i:s'));
            $endDate   = Carbon::parse($slot->date->format('Y-m-d') . ' ' . Carbon::parse($slot->end_time)->format('H:i:s'));

            $appointment = Appointment::create([
                'patient_id' => $patient->id,
                'doctor_id'  => $slot->doctor_id,
                'start_date' => $startDate,
                'end_date'   => $endDate,
                'status'     => 'scheduled',
                'reason'     => $reason,
            ]);

            $slot->update([
                'is_booked'    => true,
                'is_available' => false,
            ]);

            return $appointment->load(['patient', 'doctor']);
        });

        return [
            'appointment' => $appointment,
            'slot'        => $slot,
        ];
    }

    /**
     * Crear una cita directa (sin slot). Usado por el panel admin.
     */
    public function createDirect(array $data): Appointment
    {
        $appointment = Appointment::create($data);

        return $appointment->load('patient', 'doctor');
    }

    /**
     * Obtener slots disponibles para un doctor y fecha.
     */
    public function availableSlots(int $doctorId, string $date): array
    {
        $slots = AvailableSlot::where('doctor_id', $doctorId)
            ->whereDate('date', $date)
            ->where('is_available', true)
            ->where('is_booked', false)
            ->orderBy('start_time')
            ->get()
            ->map(fn ($s) => [
                'id'         => $s->id,
                'date'       => $s->date->format('Y-m-d'),
                'start_time' => Carbon::parse($s->start_time)->format('H:i'),
                'end_time'   => Carbon::parse($s->end_time)->format('H:i'),
            ]);

        return $slots->toArray();
    }
}
