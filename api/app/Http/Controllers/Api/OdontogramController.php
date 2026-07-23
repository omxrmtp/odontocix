<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\TeethRecord;
use App\Models\TeethRecordHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OdontogramController extends Controller
{
    public function show(Patient $patient): JsonResponse
    {
        $records = $patient->teethRecords()->with('treatment')->get()->keyBy('fdi_code');

        return response()->json($records);
    }

    public function update(Request $request, Patient $patient, string $fdiCode): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|string|in:sano,caries,ausente,implante,corona,endodoncia,extraccion,puente,protesis',
            'surface' => 'nullable|string',
            'treatment_id' => 'nullable|exists:treatments,id',
            'notes' => 'nullable|string',
        ]);

        $existing = TeethRecord::where('patient_id', $patient->id)
            ->where('fdi_code', $fdiCode)
            ->first();

        $record = TeethRecord::updateOrCreate(
            ['patient_id' => $patient->id, 'fdi_code' => $fdiCode],
            $data,
        );

        if ($existing && $record->wasChanged()) {
            $changed = [];
            foreach (['status', 'surface', 'notes'] as $field) {
                if ($record->wasChanged($field)) {
                    $changed['old_' . $field] = $existing->{$field};
                    $changed['new_' . $field] = $record->{$field};
                }
            }
            if (!empty($changed)) {
                TeethRecordHistory::create(array_merge($changed, [
                    'patient_id' => $patient->id,
                    'fdi_code' => $fdiCode,
                    'changed_by' => auth()->id(),
                ]));
            }
        }

        return response()->json($record->load('treatment'));
    }

    public function history(Patient $patient, string $fdiCode): JsonResponse
    {
        $history = TeethRecordHistory::where('patient_id', $patient->id)
            ->where('fdi_code', $fdiCode)
            ->with('changedBy')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($h) => [
                'id' => $h->id,
                'old_status' => $h->old_status,
                'new_status' => $h->new_status,
                'old_surface' => $h->old_surface,
                'new_surface' => $h->new_surface,
                'old_notes' => $h->old_notes,
                'new_notes' => $h->new_notes,
                'changed_by' => $h->changedBy ? "{$h->changedBy->name}" : null,
                'created_at' => $h->created_at,
            ]);

        return response()->json($history);
    }
}
