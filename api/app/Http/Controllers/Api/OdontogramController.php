<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\TeethRecord;
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

        $record = TeethRecord::updateOrCreate(
            ['patient_id' => $patient->id, 'fdi_code' => $fdiCode],
            $data,
        );

        return response()->json($record->load('treatment'));
    }
}
