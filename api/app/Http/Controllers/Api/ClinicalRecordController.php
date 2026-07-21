<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClinicalRecord;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClinicalRecordController extends Controller
{
    public function index(Patient $patient): JsonResponse
    {
        return response()->json(
            $patient->clinicalRecords()->with('doctor')->orderBy('record_date', 'desc')->get()
        );
    }

    public function store(Request $request, Patient $patient): JsonResponse
    {
        $data = $request->validate([
            'doctor_id' => 'nullable|exists:doctors,id',
            'record_date' => 'required|date',
            'reason' => 'nullable|string',
            'diagnosis' => 'nullable|string',
            'pathologies' => 'nullable|array',
            'pathologies.*' => 'string',
            'notes' => 'nullable|string',
        ]);

        $record = $patient->clinicalRecords()->create($data);

        return response()->json($record->load('doctor'), 201);
    }

    public function show(ClinicalRecord $record): JsonResponse
    {
        return response()->json($record->load('doctor', 'patient'));
    }

    public function update(Request $request, ClinicalRecord $record): JsonResponse
    {
        $data = $request->validate([
            'doctor_id' => 'nullable|exists:doctors,id',
            'record_date' => 'sometimes|date',
            'reason' => 'nullable|string',
            'diagnosis' => 'nullable|string',
            'pathologies' => 'nullable|array',
            'pathologies.*' => 'string',
            'notes' => 'nullable|string',
        ]);

        $record->update($data);

        return response()->json($record->load('doctor'));
    }

    public function destroy(ClinicalRecord $record): JsonResponse
    {
        $record->delete();

        return response()->json(['message' => 'Registro eliminado.']);
    }
}
