<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DoctorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $doctors = Doctor::query()
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('first_name', 'ilike', "%{$s}%")
                  ->orWhere('first_last_name', 'ilike', "%{$s}%")
                  ->orWhere('cmp', 'ilike', "%{$s}%");
            }))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($doctors);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => 'required|string|max:255',
            'first_last_name' => 'required|string|max:255',
            'second_last_name' => 'nullable|string|max:255',
            'cmp' => 'required|string|max:10|unique:doctors',
            'specialty' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
        ]);

        $doctor = Doctor::create($data);

        return response()->json($doctor, 201);
    }

    public function show(Doctor $doctor): JsonResponse
    {
        return response()->json($doctor);
    }

    public function update(Request $request, Doctor $doctor): JsonResponse
    {
        $data = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'first_last_name' => 'sometimes|string|max:255',
            'second_last_name' => 'nullable|string|max:255',
            'cmp' => 'sometimes|string|max:10|unique:doctors,cmp,'.$doctor->id,
            'specialty' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
        ]);

        $doctor->update($data);

        return response()->json($doctor);
    }

    public function destroy(Doctor $doctor): JsonResponse
    {
        $doctor->delete();

        return response()->json(['message' => 'Doctor eliminado.']);
    }
}
