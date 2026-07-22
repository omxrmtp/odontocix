<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\WhatsappOutbox;
use App\Services\WhatsappService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function __construct(private WhatsappService $whatsapp) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('view', Appointment::class);

        $query = Appointment::with(['patient:id,dni,first_name,first_last_name,phone', 'doctor:id,first_name,first_last_name']);

        if ($request->start && $request->end) {
            $query->whereBetween('start_date', [$request->start, $request->end]);
        }

        if ($request->doctor_id) {
            $query->where('doctor_id', $request->doctor_id);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $appointments = $query->orderBy('start_date')->get();

        return response()->json($appointments);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Appointment::class);

        $data = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'doctor_id' => 'nullable|exists:doctors,id',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
            'status' => 'sometimes|string',
            'reason' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $appointment = Appointment::create($data);

        return response()->json($appointment->load('patient', 'doctor'), 201);
    }

    public function show(Appointment $appointment): JsonResponse
    {
        $this->authorize('view', $appointment);

        $appointment->load(['patient', 'doctor', 'whatsappMessages']);

        $appointment->whatsapp_patient_link = $this->whatsapp->generatePatientLink($appointment);
        $appointment->whatsapp_doctor_link = $this->whatsapp->generateDoctorLink($appointment);

        return response()->json($appointment);
    }

    public function update(Request $request, Appointment $appointment): JsonResponse
    {
        $this->authorize('update', $appointment);

        $data = $request->validate([
            'patient_id' => 'sometimes|exists:patients,id',
            'doctor_id' => 'nullable|exists:doctors,id',
            'start_date' => 'sometimes|date',
            'end_date' => 'nullable|date|after:start_date',
            'status' => 'sometimes|string',
            'reason' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $appointment->update($data);

        return response()->json($appointment->load('patient', 'doctor'));
    }

    public function destroy(Appointment $appointment): JsonResponse
    {
        $this->authorize('delete', $appointment);

        $appointment->delete();

        return response()->json(['message' => 'Cita eliminada.']);
    }

    public function whatsappLinks(Appointment $appointment): JsonResponse
    {
        $this->authorize('view', $appointment);

        return response()->json([
            'patient_link' => $this->whatsapp->generatePatientLink($appointment),
            'doctor_link' => $this->whatsapp->generateDoctorLink($appointment),
        ]);
    }

    public function upcomingForReminders(): JsonResponse
    {
        $this->authorize('view', Appointment::class);

        $from = now()->addHours(24);
        $to = now()->addHours(48);

        $appointments = Appointment::whereBetween('start_date', [$from, $to])
            ->where('whatsapp_patient_sent', false)
            ->whereIn('status', ['scheduled', 'confirmed'])
            ->with(['patient:id,dni,first_name,first_last_name,phone,email', 'doctor:id,first_name,first_last_name'])
            ->orderBy('start_date')
            ->get();

        $appointments->each(function (Appointment $appointment) {
            $appointment->whatsapp_patient_link = $this->whatsapp->generatePatientLink($appointment);
            $appointment->whatsapp_doctor_link = $this->whatsapp->generateDoctorLink($appointment);
        });

        return response()->json($appointments);
    }
}
