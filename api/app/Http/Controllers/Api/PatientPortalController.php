<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AvailableSlot;
use App\Models\ConsentForm;
use App\Models\Doctor;
use App\Models\Patient;
use App\Services\TenantService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PatientPortalController extends Controller
{
    private function setTenantFromPatient(Patient $patient): void
    {
        App::make(TenantService::class)->setCurrent($patient->tenant);
    }

    private function findPatient(string $token): Patient
    {
        $patient = Patient::where('portal_token', $token)->first();

        if (! $patient) {
            abort(404, 'Paciente no encontrado.');
        }

        $this->setTenantFromPatient($patient);

        return $patient;
    }

    public function patient(string $token): JsonResponse
    {
        $patient = $this->findPatient($token);

        return response()->json([
            'id' => $patient->id,
            'first_name' => $patient->first_name,
            'second_name' => $patient->second_name,
            'first_last_name' => $patient->first_last_name,
            'second_last_name' => $patient->second_last_name,
            'phone' => $patient->phone,
            'email' => $patient->email,
            'dni' => $patient->dni,
            'birth_date' => $patient->birth_date,
            'blood_type' => $patient->blood_type,
            'tenant_name' => $patient->tenant?->name,
            'tenant_phone' => $patient->tenant?->phone,
            'tenant_id' => $patient->tenant_id,
        ]);
    }

    public function updatePatient(Request $request, string $token): JsonResponse
    {
        $patient = $this->findPatient($token);

        $data = $request->validate([
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
        ]);

        $patient->update($data);

        return response()->json([
            'message' => 'Datos actualizados con éxito.',
            'phone' => $patient->phone,
            'email' => $patient->email,
        ]);
    }

    public function appointments(string $token): JsonResponse
    {
        $patient = $this->findPatient($token);

        $appointments = $patient->appointments()
            ->where('start_date', '>=', now()->subDay())
            ->with('doctor')
            ->orderBy('start_date')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'start_date' => $a->start_date,
                'end_date' => $a->end_date,
                'status' => $a->status,
                'reason' => $a->reason,
                'doctor_name' => $a->doctor ? "{$a->doctor->first_name} {$a->doctor->first_last_name}" : null,
                'can_cancel' => $a->start_date > now() && $a->status !== 'cancelled',
            ]);

        return response()->json($appointments);
    }

    public function cancelAppointment(string $token, Appointment $appointment): JsonResponse
    {
        $patient = $this->findPatient($token);

        if ($appointment->patient_id !== $patient->id) {
            abort(403, 'No tienes permiso para cancelar esta cita.');
        }

        if ($appointment->status === 'cancelled') {
            return response()->json(['message' => 'La cita ya está cancelada.'], 400);
        }

        if ($appointment->start_date < now()) {
            return response()->json(['message' => 'No puedes cancelar una cita pasada.'], 400);
        }

        $appointment->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Cita cancelada con éxito.']);
    }

    public function history(string $token): JsonResponse
    {
        $patient = $this->findPatient($token);

        $records = $patient->clinicalRecords()
            ->with('doctor')
            ->orderBy('record_date', 'desc')
            ->limit(20)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'record_date' => $r->record_date,
                'reason' => $r->reason,
                'diagnosis' => $r->diagnosis,
                'doctor_name' => $r->doctor ? "{$r->doctor->first_name} {$r->doctor->first_last_name}" : null,
            ]);

        $treatments = $patient->treatments()
            ->with('treatment', 'doctor')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'treatment_name' => $t->treatment?->name,
                'status' => $t->status,
                'agreed_price' => $t->agreed_price,
                'tooth_fdi' => $t->tooth_fdi,
                'doctor_name' => $t->doctor ? "{$t->doctor->first_name} {$t->doctor->first_last_name}" : null,
                'created_at' => $t->created_at,
            ]);

        return response()->json([
            'clinical_records' => $records,
            'treatments' => $treatments,
        ]);
    }

    public function budgets(string $token): JsonResponse
    {
        $patient = $this->findPatient($token);

        $budgets = $patient->budgets()
            ->with('items.treatment')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
                'status' => $b->status,
                'total' => $b->total,
                'discount_percent' => $b->discount_percent,
                'discount_amount' => $b->discount_amount,
                'grand_total' => $b->grand_total,
                'paid_amount' => $b->paid_amount,
                'balance' => $b->balance,
                'items' => $b->items->map(fn ($item) => [
                    'treatment_name' => $item->treatment?->name,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                ]),
            ]);

        return response()->json($budgets);
    }

    public function payments(string $token): JsonResponse
    {
        $patient = $this->findPatient($token);

        $payments = $patient->payments()
            ->with('budget')
            ->orderBy('payment_date', 'desc')
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'amount' => $p->amount,
                'payment_date' => $p->payment_date,
                'method' => $p->method,
                'reference' => $p->reference ?? '-',
                'budget_id' => $p->budget_id,
                'notes' => $p->notes,
            ]);

        return response()->json($payments);
    }

    public function doctors(string $token): JsonResponse
    {
        $patient = $this->findPatient($token);

        $doctors = Doctor::where('tenant_id', $patient->tenant_id)
            ->orderBy('first_name')
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'name' => "{$d->first_name} {$d->first_last_name}",
                'specialty' => $d->specialty,
                'cmp' => $d->cmp,
            ]);

        return response()->json($doctors);
    }

    public function slots(Request $request, string $token): JsonResponse
    {
        $patient = $this->findPatient($token);

        $data = $request->validate([
            'doctor_id' => 'required|exists:doctors,id',
            'date' => 'required|date',
        ]);

        $slots = AvailableSlot::where('tenant_id', $patient->tenant_id)
            ->where('doctor_id', $data['doctor_id'])
            ->where('date', $data['date'])
            ->where('is_available', true)
            ->where('is_booked', false)
            ->orderBy('start_time')
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'start_time' => Carbon::parse($s->start_time)->format('H:i'),
                'end_time' => Carbon::parse($s->end_time)->format('H:i'),
            ]);

        return response()->json($slots);
    }

    public function bookAppointment(Request $request, string $token): JsonResponse
    {
        $patient = $this->findPatient($token);

        $data = $request->validate([
            'slot_id' => 'required|exists:available_slots,id',
            'doctor_id' => 'required|exists:doctors,id',
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

        $appointment = DB::transaction(function () use ($data, $slot, $patient) {
            $startDate = Carbon::parse($slot->date->format('Y-m-d') . ' ' . Carbon::parse($slot->start_time)->format('H:i:s'));
            $endDate = Carbon::parse($slot->date->format('Y-m-d') . ' ' . Carbon::parse($slot->end_time)->format('H:i:s'));

            $appointment = Appointment::create([
                'patient_id' => $patient->id,
                'doctor_id' => $data['doctor_id'],
                'start_date' => $startDate,
                'end_date' => $endDate,
                'status' => 'scheduled',
                'reason' => $data['reason'],
            ]);

            $slot->update([
                'is_booked' => true,
                'is_available' => false,
            ]);

            return $appointment->load('doctor');
        });

        return response()->json([
            'message' => 'Cita reservada con éxito.',
            'appointment' => [
                'id' => $appointment->id,
                'start_date' => $appointment->start_date->toDateTimeString(),
                'end_date' => $appointment->end_date?->toDateTimeString(),
                'reason' => $appointment->reason,
                'status' => $appointment->status,
                'doctor_name' => $appointment->doctor ? "{$appointment->doctor->first_name} {$appointment->doctor->first_last_name}" : null,
            ],
        ], 201);
    }

    public function consentForms(string $token): JsonResponse
    {
        $patient = $this->findPatient($token);

        $forms = $patient->consentForms()
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($f) => [
                'id' => $f->id,
                'title' => $f->title,
                'signed_at' => $f->signed_at,
                'signed' => $f->signed_at !== null,
                'content' => $f->signed_at ? null : $f->content,
            ]);

        return response()->json($forms);
    }

    public function signConsentForm(Request $request, string $token, ConsentForm $consentForm): JsonResponse
    {
        $patient = $this->findPatient($token);

        if ($consentForm->patient_id !== $patient->id) {
            abort(403, 'Este formulario no te pertenece.');
        }

        if ($consentForm->signed_at) {
            return response()->json(['message' => 'Este formulario ya fue firmado.'], 400);
        }

        $data = $request->validate([
            'signature_data' => 'required|string',
        ]);

        $consentForm->update([
            'signature_data' => $data['signature_data'],
            'signed_by_patient' => true,
            'signed_at' => now(),
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Formulario firmado con éxito.',
            'signed_at' => $consentForm->signed_at,
        ]);
    }

    public function downloadPaymentReceipt(string $token, int $paymentId): Response|JsonResponse
    {
        try {
            $patient = $this->findPatient($token);

            $payment = $patient->payments()->with('budget')->findOrFail($paymentId);

            $pdf = Pdf::loadView('pdf.receipt', [
                'payment' => $payment,
                'patient' => $patient,
                'tenant' => $patient->tenant,
                'budget' => $payment->budget,
            ]);

            return $pdf->download("recibo-{$payment->id}.pdf");
        } catch (\Throwable $e) {
            Log::error("Portal PDF receipt failed: {$e->getMessage()}", [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Error al generar el recibo PDF.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function historyPdf(string $token): Response|JsonResponse
    {
        try {
            $patient = $this->findPatient($token);

            $patient->load(['clinicalRecords.doctor', 'treatments.treatment', 'teethRecords']);

            $pdf = Pdf::loadView('pdf.history', [
                'patient' => $patient,
                'tenant' => $patient->tenant,
                'clinicalRecords' => $patient->clinicalRecords,
                'treatments' => $patient->treatments,
                'teethRecords' => $patient->teethRecords,
            ]);

            return $pdf->download("historia-{$patient->id}.pdf");
        } catch (\Throwable $e) {
            Log::error("Portal PDF history failed: {$e->getMessage()}", [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Error al generar la historia PDF.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
