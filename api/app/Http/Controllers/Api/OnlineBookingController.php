<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AvailableSlot;
use App\Models\Doctor;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OnlineBookingController extends Controller
{
    public function doctors(Request $request): JsonResponse
    {
        $doctors = Doctor::query()
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'first_last_name', 'cmp', 'specialty'])
            ->map(fn ($d) => [
                'id' => $d->id,
                'name' => "{$d->first_name} {$d->first_last_name}",
                'cmp' => $d->cmp,
                'specialty' => $d->specialty,
            ]);

        return response()->json($doctors);
    }

    public function slots(Request $request): JsonResponse
    {
        $data = $request->validate([
            'doctor_id' => 'required|exists:doctors,id',
            'date' => 'required|date',
        ]);

        $slots = AvailableSlot::where('doctor_id', $data['doctor_id'])
            ->whereDate('date', $data['date'])
            ->where('is_available', true)
            ->where('is_booked', false)
            ->orderBy('start_time')
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'date' => $s->date->format('Y-m-d'),
                'start_time' => Carbon::parse($s->start_time)->format('H:i'),
                'end_time' => Carbon::parse($s->end_time)->format('H:i'),
            ]);

        return response()->json($slots);
    }

    public function book(Request $request): JsonResponse
    {
        $data = $request->validate([
            'slot_id' => 'required|exists:available_slots,id',
            'patient_name' => 'required|string|max:255',
            'patient_phone' => 'required|string|max:20',
            'patient_email' => 'nullable|email|max:255',
            'patient_dni' => 'required|string|max:20',
            'reason' => 'nullable|string|max:500',
        ]);

        $slot = AvailableSlot::where('id', $data['slot_id'])
            ->where('is_available', true)
            ->where('is_booked', false)
            ->lockForUpdate()
            ->first();

        if (! $slot) {
            return response()->json(['message' => 'El horario seleccionado ya no está disponible.'], 409);
        }

        $appointment = DB::transaction(function () use ($data, $slot) {
            $patient = Patient::where('dni', $data['patient_dni'])->first();

            if (! $patient) {
                $nameParts = explode(' ', trim($data['patient_name']), 2);
                $firstName = $nameParts[0] ?? $data['patient_name'];
                $lastName = $nameParts[1] ?? '';

                $patient = Patient::create([
                    'dni' => $data['patient_dni'],
                    'first_name' => $firstName,
                    'first_last_name' => $lastName,
                    'phone' => $data['patient_phone'],
                    'email' => $data['patient_email'],
                ]);
            }

            $startDate = Carbon::parse($slot->date->format('Y-m-d') . ' ' . Carbon::parse($slot->start_time)->format('H:i:s'));
            $endDate = Carbon::parse($slot->date->format('Y-m-d') . ' ' . Carbon::parse($slot->end_time)->format('H:i:s'));

            $appointment = Appointment::create([
                'patient_id' => $patient->id,
                'doctor_id' => $slot->doctor_id,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'status' => 'scheduled',
                'reason' => $data['reason'],
            ]);

            $slot->update([
                'is_booked' => true,
                'is_available' => false,
            ]);

            return $appointment->load(['patient', 'doctor']);
        });

        $tenant = \App::make(\App\Services\TenantService::class)->current();

        return response()->json([
            'message' => 'Cita reservada con éxito.',
            'appointment' => [
                'id' => $appointment->id,
                'start_date' => $appointment->start_date->toDateTimeString(),
                'end_date' => $appointment->end_date?->toDateTimeString(),
                'reason' => $appointment->reason,
                'status' => $appointment->status,
                'patient_name' => "{$appointment->patient->first_name} {$appointment->patient->first_last_name}",
                'doctor_name' => $appointment->doctor ? "{$appointment->doctor->first_name} {$appointment->doctor->first_last_name}" : null,
                'slot' => [
                    'date' => $slot->date->format('Y-m-d'),
                    'start_time' => Carbon::parse($slot->start_time)->format('H:i'),
                    'end_time' => Carbon::parse($slot->end_time)->format('H:i'),
                ],
                'tenant_name' => $tenant?->name,
                'tenant_phone' => $tenant?->phone,
            ],
        ], 201);
    }
}
