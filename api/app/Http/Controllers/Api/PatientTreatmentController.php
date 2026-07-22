<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\PatientTreatment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientTreatmentController extends Controller
{
    public function store(Request $request, Patient $patient): JsonResponse
    {
        $data = $request->validate([
            'treatment_id' => 'required|exists:treatments,id',
            'doctor_id' => 'nullable|exists:doctors,id',
            'status' => 'nullable|string|in:pending,in_progress,completed,cancelled',
            'agreed_price' => 'nullable|numeric|min:0',
            'tooth_fdi' => 'nullable|string|max:5',
        ]);

        $treatment = $patient->treatments()->create($data);

        return response()->json($treatment->load('treatment', 'doctor'), 201);
    }

    public function update(Request $request, PatientTreatment $treatment): JsonResponse
    {
        $data = $request->validate([
            'treatment_id' => 'sometimes|exists:treatments,id',
            'doctor_id' => 'nullable|exists:doctors,id',
            'status' => 'nullable|string|in:pending,in_progress,completed,cancelled',
            'agreed_price' => 'nullable|numeric|min:0',
            'tooth_fdi' => 'nullable|string|max:5',
        ]);

        $treatment->update($data);

        return response()->json($treatment->load('treatment', 'doctor'));
    }

    public function destroy(PatientTreatment $treatment): JsonResponse
    {
        $treatment->delete();

        return response()->json(['message' => 'Tratamiento eliminado.']);
    }
}
