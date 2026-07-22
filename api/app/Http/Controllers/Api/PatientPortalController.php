<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Services\TenantService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\App;

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
        ]);
    }

    public function appointments(string $token): JsonResponse
    {
        $patient = $this->findPatient($token);

        $appointments = $patient->appointments()
            ->where('start_date', '>=', now())
            ->where('status', '!=', 'cancelled')
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
            ]);

        return response()->json($appointments);
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

    public function historyPdf(string $token): Response
    {
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
    }
}