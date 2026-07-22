<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConsentForm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConsentFormController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('view', ConsentForm::class);

        $forms = ConsentForm::with('patient:id,dni,first_name,first_last_name')
            ->when($request->patient_id, fn ($q) => $q->where('patient_id', $request->patient_id))
            ->when($request->status === 'signed', fn ($q) => $q->whereNotNull('signed_at'))
            ->when($request->status === 'pending', fn ($q) => $q->whereNull('signed_at'))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($forms);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', ConsentForm::class);

        $data = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'title' => 'required|string|max:255',
            'content' => 'required|string',
        ]);

        $form = ConsentForm::create($data);

        return response()->json(
            $form->load('patient:id,dni,first_name,first_last_name'),
            201
        );
    }

    public function show(ConsentForm $form): JsonResponse
    {
        $this->authorize('view', $form);

        return response()->json(
            $form->load('patient:id,dni,first_name,second_name,first_last_name,second_last_name,phone,email,birth_date')
        );
    }

    public function update(Request $request, ConsentForm $form): JsonResponse
    {
        $this->authorize('update', $form);

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
        ]);

        $form->update($data);

        return response()->json($form->load('patient:id,dni,first_name,first_last_name'));
    }

    public function sign(Request $request, ConsentForm $form): JsonResponse
    {
        $this->authorize('update', $form);

        $data = $request->validate([
            'signature_data' => 'required|string',
            'signed_by_patient' => 'sometimes|boolean',
            'signed_by_guardian' => 'sometimes|boolean',
            'guardian_name' => 'nullable|string|max:255',
            'guardian_dni' => 'nullable|string|max:20',
        ]);

        $form->update([
            'signature_data' => $data['signature_data'],
            'signed_at' => now(),
            'signed_by_patient' => $data['signed_by_patient'] ?? true,
            'signed_by_guardian' => $data['signed_by_guardian'] ?? false,
            'guardian_name' => $data['guardian_name'] ?? null,
            'guardian_dni' => $data['guardian_dni'] ?? null,
            'ip_address' => $request->ip(),
        ]);

        return response()->json($form->load('patient:id,dni,first_name,first_last_name'));
    }

    public function destroy(ConsentForm $form): JsonResponse
    {
        $this->authorize('delete', $form);

        $form->delete();

        return response()->json(['message' => 'Consentimiento eliminado.']);
    }
}
