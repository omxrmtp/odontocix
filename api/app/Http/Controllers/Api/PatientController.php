<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Services\ReniecService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    public function __construct(private ReniecService $reniec) {}

    public function index(Request $request): JsonResponse
    {
        $patients = Patient::query()
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('dni', 'like', "%{$s}%")
                  ->orWhere('first_name', 'ilike', "%{$s}%")
                  ->orWhere('first_last_name', 'ilike', "%{$s}%")
                  ->orWhere('second_last_name', 'ilike', "%{$s}%");
            }))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($patients);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'dni' => 'required|string|size:8|unique:patients',
            'first_name' => 'required|string|max:255',
            'first_last_name' => 'required|string|max:255',
            'second_last_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'blood_type' => 'nullable|string|max:5',
            'birth_date' => 'nullable|date',
            'observations' => 'nullable|string',
        ]);

        $patient = Patient::create($data + ['reniec_cached_at' => now()]);

        return response()->json($patient, 201);
    }

    public function show(Patient $patient): JsonResponse
    {
        return response()->json($patient->load('clinicalRecords', 'teethRecords'));
    }

    public function update(Request $request, Patient $patient): JsonResponse
    {
        $data = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'first_last_name' => 'sometimes|string|max:255',
            'second_last_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'blood_type' => 'nullable|string|max:5',
            'birth_date' => 'nullable|date',
            'observations' => 'nullable|string',
        ]);

        $patient->update($data);

        return response()->json($patient);
    }

    public function destroy(Patient $patient): JsonResponse
    {
        $patient->delete();

        return response()->json(['message' => 'Paciente eliminado.']);
    }

    public function lookup(Request $request): JsonResponse
    {
        $request->validate(['dni' => 'required|string|size:8']);

        $existing = Patient::where('dni', $request->dni)->first();
        if ($existing) {
            return response()->json(['source' => 'cache', 'data' => $existing]);
        }

        $data = $this->reniec->lookup($request->dni);

        if (! $data) {
            return response()->json(['message' => 'DNI no encontrado en RENIEC.'], 404);
        }

        return response()->json(['source' => 'reniec', 'data' => $data]);
    }

    public function history(Patient $patient): JsonResponse
    {
        return response()->json(
            $patient->load(['clinicalRecords.doctor', 'teethRecords', 'treatments.treatment'])
        );
    }
}
