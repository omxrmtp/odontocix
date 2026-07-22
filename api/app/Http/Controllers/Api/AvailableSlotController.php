<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AvailableSlot;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AvailableSlotController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AvailableSlot::with('doctor:id,first_name,first_last_name,cmp,specialty');

        if ($request->doctor_id) {
            $query->where('doctor_id', $request->doctor_id);
        }

        if ($request->start && $request->end) {
            $query->whereBetween('date', [$request->start, $request->end]);
        }

        if ($request->date) {
            $query->whereDate('date', $request->date);
        }

        if (! $request->boolean('all')) {
            $query->where('is_available', true);
        }

        $slots = $query->orderBy('date')->orderBy('start_time')->get();

        return response()->json($slots);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'doctor_id' => 'required|exists:doctors,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'duration_minutes' => 'nullable|integer|min:5|max:240',
        ]);

        $doctorId = $data['doctor_id'];
        $startDate = Carbon::parse($data['start_date']);
        $endDate = Carbon::parse($data['end_date']);
        $startTime = Carbon::parse($data['start_time']);
        $endTime = Carbon::parse($data['end_time']);
        $duration = $data['duration_minutes'] ?? 30;

        $created = [];

        DB::transaction(function () use ($doctorId, $startDate, $endDate, $startTime, $endTime, $duration, &$created) {
            for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
                $current = $startTime->copy();
                while ($current->lt($endTime)) {
                    $slotStart = $current->format('H:i:s');
                    $slotEnd = $current->copy()->addMinutes($duration)->format('H:i:s');

                    if ($current->copy()->addMinutes($duration)->gt($endTime)) {
                        break;
                    }

                    $slot = AvailableSlot::create([
                        'doctor_id' => $doctorId,
                        'date' => $date->format('Y-m-d'),
                        'start_time' => $slotStart,
                        'end_time' => $slotEnd,
                        'is_available' => true,
                        'is_booked' => false,
                    ]);

                    $created[] = $slot;

                    $current->addMinutes($duration);
                }
            }
        });

        return response()->json($created, 201);
    }

    public function update(Request $request, AvailableSlot $availableSlot): JsonResponse
    {
        $data = $request->validate([
            'is_available' => 'sometimes|boolean',
            'is_booked' => 'sometimes|boolean',
        ]);

        $availableSlot->update($data);

        return response()->json($availableSlot->load('doctor:id,first_name,first_last_name'));
    }

    public function destroy(AvailableSlot $availableSlot): JsonResponse
    {
        $availableSlot->delete();

        return response()->json(['message' => 'Slot eliminado.']);
    }
}
