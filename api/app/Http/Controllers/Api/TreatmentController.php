<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Treatment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TreatmentController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('view', Treatment::class);

        return response()->json(Treatment::all());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Treatment::class);

        $treatment = Treatment::create($request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'base_price' => 'nullable|numeric|min:0',
            'estimated_duration_min' => 'nullable|integer|min:1',
        ]));

        return response()->json($treatment, 201);
    }

    public function update(Request $request, Treatment $treatment): JsonResponse
    {
        $this->authorize('update', $treatment);

        $treatment->update($request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'base_price' => 'nullable|numeric|min:0',
            'estimated_duration_min' => 'nullable|integer|min:1',
        ]));

        return response()->json($treatment);
    }

    public function destroy(Treatment $treatment): JsonResponse
    {
        $this->authorize('delete', $treatment);

        $treatment->delete();

        return response()->json(['message' => 'Tratamiento eliminado.']);
    }
}
