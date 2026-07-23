<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\ConsentForm;
use App\Models\Patient;
use App\Models\Payment;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class PdfController extends Controller
{
    private function loadPdf(string $view, array $data, string $filename): Response|JsonResponse
    {
        try {
            $pdf = Pdf::loadView($view, $data);
            $pdf->setPaper('A4', 'portrait');
            $pdf->setOptions(['isHtml5ParserEnabled' => true, 'isRemoteEnabled' => false]);
            return $pdf->download($filename);
        } catch (\Throwable $e) {
            Log::error("PDF generation failed [{$view}]: {$e->getMessage()}", [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Error al generar el PDF. Intente nuevamente o contacte al administrador.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function budgetPdf(Budget $budget): Response|JsonResponse
    {
        $budget->load(['items.treatment', 'patient']);
        $tenant = auth()->user()->tenant;

        return $this->loadPdf('pdf.budget', [
            'budget' => $budget,
            'tenant' => $tenant,
            'patient' => $budget->patient,
            'items' => $budget->items,
        ], "presupuesto-{$budget->id}.pdf");
    }

    public function paymentReceipt(Payment $payment): Response|JsonResponse
    {
        $payment->load(['budget.items', 'patient']);
        $tenant = auth()->user()->tenant;

        return $this->loadPdf('pdf.receipt', [
            'payment' => $payment,
            'tenant' => $tenant,
            'patient' => $payment->patient,
            'budget' => $payment->budget,
        ], "recibo-{$payment->id}.pdf");
    }

    public function patientHistory(Patient $patient): Response|JsonResponse
    {
        $patient->load(['clinicalRecords.doctor', 'treatments.treatment', 'teethRecords']);
        $tenant = auth()->user()->tenant;

        return $this->loadPdf('pdf.history', [
            'patient' => $patient,
            'tenant' => $tenant,
            'clinicalRecords' => $patient->clinicalRecords,
            'treatments' => $patient->treatments,
            'teethRecords' => $patient->teethRecords,
        ], "historia-{$patient->id}.pdf");
    }

    public function consentFormPdf(ConsentForm $form): Response|JsonResponse
    {
        $form->load('patient');
        $tenant = auth()->user()->tenant;

        $content = str_replace(
            ['{{patient_name}}', '{{patient_dni}}'],
            [
                $form->patient->full_name ?? ($form->patient->first_name . ' ' . $form->patient->first_last_name),
                $form->patient->dni,
            ],
            $form->content
        );

        return $this->loadPdf('pdf.consent_form', [
            'form' => $form,
            'tenant' => $tenant,
            'patient' => $form->patient,
            'content' => $content,
        ], "consentimiento-{$form->id}.pdf");
    }
}
