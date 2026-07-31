<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Services\AppointmentBookingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OnlineBookingController extends Controller
{
    public function __construct(
        private AppointmentBookingService $booking
    ) {}

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

        $slots = $this->booking->availableSlots($data['doctor_id'], $data['date']);

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

        $nameParts = explode(' ', trim($data['patient_name']), 2);
        $patientData = [
            'dni' => $data['patient_dni'],
            'first_name' => $nameParts[0] ?? $data['patient_name'],
            'first_last_name' => $nameParts[1] ?? '',
            'phone' => $data['patient_phone'],
            'email' => $data['patient_email'],
        ];

        try {
            $result = $this->booking->bookBySlot(
                $data['slot_id'],
                $patientData,
                $data['reason']
            );
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'El horario seleccionado ya no está disponible.',
                'errors'  => $e->errors(),
            ], 409);
        }

        $appointment = $result['appointment'];
        $slot        = $result['slot'];
        $tenant      = app(\App\Services\TenantService::class)->current();

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
