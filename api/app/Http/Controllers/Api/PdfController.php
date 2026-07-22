<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\ConsentForm;
use App\Models\Patient;
use App\Models\Payment;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class PdfController extends Controller
{
    public function budgetPdf(Budget $budget): Response
    {
        $budget->load(['items.treatment', 'patient']);

        $tenant = auth()->user()->tenant;

        $pdf = Pdf::loadView('pdf.budget', [
            'budget' => $budget,
            'tenant' => $tenant,
            'patient' => $budget->patient,
            'items' => $budget->items,
        ]);

        return $pdf->download("presupuesto-{$budget->id}.pdf");
    }

    public function paymentReceipt(Payment $payment): Response
    {
        $payment->load(['budget.items', 'patient']);

        $tenant = auth()->user()->tenant;

        $pdf = Pdf::loadView('pdf.receipt', [
            'payment' => $payment,
            'tenant' => $tenant,
            'patient' => $payment->patient,
            'budget' => $payment->budget,
        ]);

        return $pdf->download("recibo-{$payment->id}.pdf");
    }

    public function patientHistory(Patient $patient): Response
    {
        $patient->load(['clinicalRecords.doctor', 'treatments.treatment', 'teethRecords']);

        $tenant = auth()->user()->tenant;

        $pdf = Pdf::loadView('pdf.history', [
            'patient' => $patient,
            'tenant' => $tenant,
            'clinicalRecords' => $patient->clinicalRecords,
            'treatments' => $patient->treatments,
            'teethRecords' => $patient->teethRecords,
        ]);

        return $pdf->download("historia-{$patient->id}.pdf");
    }

    public function consentFormPdf(ConsentForm $form): Response
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

        $pdf = Pdf::loadView('pdf.consent_form', [
            'form' => $form,
            'tenant' => $tenant,
            'patient' => $form->patient,
            'content' => $content,
        ]);

        return $pdf->download("consentimiento-{$form->id}.pdf");
    }
}
