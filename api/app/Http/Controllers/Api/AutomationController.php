<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient;
use App\Services\AppointmentBookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutomationController extends Controller
{
    public function __construct(
        private AppointmentBookingService $booking
    ) {}

    public function availability(Request $request): JsonResponse
    {
        $data = $request->validate([
            'doctor_id' => 'required|exists:doctors,id',
            'date'      => 'required|date',
        ]);

        $slots = $this->booking->availableSlots($data['doctor_id'], $data['date']);

        return response()->json([
            'doctor_id' => $data['doctor_id'],
            'date'      => $data['date'],
            'slots'     => $slots,
        ]);
    }

    public function upsertPatient(Request $request): JsonResponse
    {
        $data = $request->validate([
            'dni'              => 'required|string|size:8',
            'first_name'       => 'required|string|max:255',
            'first_last_name'  => 'required|string|max:255',
            'second_name'      => 'nullable|string|max:255',
            'second_last_name' => 'nullable|string|max:255',
            'phone'            => 'nullable|string|max:20',
            'email'            => 'nullable|email|max:255',
            'address'          => 'nullable|string|max:255',
            'reference'        => 'nullable|string|max:255',
            'birth_date'       => 'nullable|date',
            'gender'           => 'nullable|string|max:1',
            'observations'     => 'nullable|string',
        ]);

        $existing = Patient::where('dni', $data['dni'])->first();

        if ($existing) {
            return response()->json([
                'message' => 'Paciente ya existente.',
                'patient' => $existing,
                'created' => false,
            ]);
        }

        $patient = $this->booking->upsertPatient($data);

        return response()->json([
            'message' => 'Paciente creado.',
            'patient' => $patient,
            'created' => true,
        ], 201);
    }

    public function appointments(Request $request): JsonResponse
    {
        $query = Appointment::with([
            'patient:id,dni,first_name,first_last_name,phone',
            'doctor:id,first_name,first_last_name',
        ]);

        if ($request->start && $request->end) {
            $query->whereBetween('start_date', [$request->start, $request->end]);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->doctor_id) {
            $query->where('doctor_id', $request->doctor_id);
        }

        if ($request->patient_id) {
            $query->where('patient_id', $request->patient_id);
        }

        $appointments = $query->orderBy('start_date')->paginate(50);

        return response()->json($appointments);
    }

    public function bookAppointment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'slot_id'       => 'required|exists:available_slots,id',
            'patient_name'  => 'required|string|max:255',
            'patient_phone' => 'required|string|max:20',
            'patient_email' => 'nullable|email|max:255',
            'patient_dni'   => 'required|string|size:8',
            'reason'        => 'nullable|string|max:500',
        ]);

        $patientData = [
            'dni' => $data['patient_dni'],
            'first_name' => explode(' ', $data['patient_name'], 2)[0] ?? $data['patient_name'],
            'first_last_name' => explode(' ', $data['patient_name'], 2)[1] ?? '',
            'phone' => $data['patient_phone'],
            'email' => $data['patient_email'] ?? null,
        ];

        $result = $this->booking->bookBySlot(
            $data['slot_id'],
            $patientData,
            $data['reason']
        );

        $appointment = $result['appointment'];
        $slot        = $result['slot'];

        return response()->json([
            'message' => 'Cita reservada con éxito.',
            'appointment' => [
                'id'           => $appointment->id,
                'start_date'   => $appointment->start_date->toDateTimeString(),
                'end_date'     => $appointment->end_date?->toDateTimeString(),
                'reason'       => $appointment->reason,
                'status'       => $appointment->status,
                'patient_name' => "{$appointment->patient->first_name} {$appointment->patient->first_last_name}",
                'doctor_name'  => $appointment->doctor ? "{$appointment->doctor->first_name} {$appointment->doctor->first_last_name}" : null,
                'slot' => [
                    'date'       => $slot->date->format('Y-m-d'),
                    'start_time' => \Carbon\Carbon::parse($slot->start_time)->format('H:i'),
                    'end_time'   => \Carbon\Carbon::parse($slot->end_time)->format('H:i'),
                ],
            ],
        ], 201);
    }
}
