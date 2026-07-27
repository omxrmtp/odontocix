<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AvailableSlot;
use App\Models\BlockedDate;
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

        $slots = $query->orderBy('date')->orderBy('start_time')->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'date' => $s->date,
                'start_time' => substr($s->start_time, 0, 5),
                'end_time' => substr($s->end_time, 0, 5),
                'is_available' => $s->is_available,
                'is_booked' => $s->is_booked,
                'doctor' => $s->doctor,
                'created_at' => $s->created_at,
                'updated_at' => $s->updated_at,
            ]);

        return response()->json($slots);
    }

    public function show(AvailableSlot $availableSlot): JsonResponse
    {
        return response()->json([
            'id' => $availableSlot->id,
            'date' => $availableSlot->date,
            'start_time' => substr($availableSlot->start_time, 0, 5),
            'end_time' => substr($availableSlot->end_time, 0, 5),
            'is_available' => $availableSlot->is_available,
            'is_booked' => $availableSlot->is_booked,
            'doctor' => $availableSlot->doctor,
        ]);
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
            'skip_blocked' => 'nullable|boolean',
        ]);

        $doctorId = $data['doctor_id'];
        $startDate = Carbon::parse($data['start_date']);
        $endDate = Carbon::parse($data['end_date']);
        $startTime = Carbon::parse($data['start_time']);
        $endTime = Carbon::parse($data['end_time']);
        $duration = $data['duration_minutes'] ?? 30;
        $skipBlocked = $data['skip_blocked'] ?? false;

        // Cargar fechas bloqueadas del rango
        $blockedDates = BlockedDate::whereBetween('date', [
            $startDate->format('Y-m-d'),
            $endDate->format('Y-m-d'),
        ])->pluck('date')->map(fn ($d) => $d->format('Y-m-d'))->toArray();

        $created = [];
        $skippedBlocked = 0;
        $skippedDuplicates = 0;

        DB::transaction(function () use ($doctorId, $startDate, $endDate, $startTime, $endTime, $duration, $request, $blockedDates, $skipBlocked, &$created, &$skippedBlocked, &$skippedDuplicates) {
            $weekdays = $request->input('weekdays');
            $weekdayArray = $weekdays ? array_map('intval', explode(',', $weekdays)) : null;

            for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
                if ($weekdayArray !== null && !in_array($date->dayOfWeek, $weekdayArray)) {
                    continue;
                }

                $dateStr = $date->format('Y-m-d');

                // Saltar fechas bloqueadas
                if (in_array($dateStr, $blockedDates)) {
                    if ($skipBlocked) {
                        $skippedBlocked++;
                        continue;
                    }
                    throw new \RuntimeException("La fecha {$dateStr} está bloqueada (feriado o día no laborable).");
                }

                $current = $startTime->copy();
                while ($current->lt($endTime)) {
                    $slotStart = $current->format('H:i:s');
                    $slotEnd = $current->copy()->addMinutes($duration)->format('H:i:s');

                    if ($current->copy()->addMinutes($duration)->gt($endTime)) {
                        break;
                    }

                    // Verificar duplicados
                    $exists = AvailableSlot::where('doctor_id', $doctorId)
                        ->where('date', $dateStr)
                        ->where('start_time', $slotStart)
                        ->where('end_time', $slotEnd)
                        ->exists();

                    if ($exists) {
                        $skippedDuplicates++;
                        $current->addMinutes($duration);
                        continue;
                    }

                    $slot = AvailableSlot::create([
                        'doctor_id' => $doctorId,
                        'date' => $dateStr,
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

        $message = count($created) . ' horarios creados';
        if ($skippedBlocked > 0) $message .= " ({$skippedBlocked} fechas bloqueadas omitidas)";
        if ($skippedDuplicates > 0) $message .= " ({$skippedDuplicates} duplicados omitidos)";

        return response()->json([
            'data' => $created,
            'message' => $message,
            'created_count' => count($created),
            'skipped_blocked' => $skippedBlocked,
            'skipped_duplicates' => $skippedDuplicates,
        ], 201);
    }

    public function update(Request $request, AvailableSlot $availableSlot): JsonResponse
    {
        $data = $request->validate([
            'doctor_id' => 'sometimes|exists:doctors,id',
            'date' => 'sometimes|date',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i|after:start_time',
            'is_available' => 'sometimes|boolean',
            'is_booked' => 'sometimes|boolean',
        ]);

        // Verificar duplicado si cambia doctor/fecha/hora
        if (isset($data['doctor_id']) || isset($data['date']) || isset($data['start_time']) || isset($data['end_time'])) {
            $doctorId = $data['doctor_id'] ?? $availableSlot->doctor_id;
            $date = $data['date'] ?? $availableSlot->date;
            $startTime = ($data['start_time'] ?? $availableSlot->start_time) . ':00';
            $endTime = ($data['end_time'] ?? $availableSlot->end_time) . ':00';

            $exists = AvailableSlot::where('doctor_id', $doctorId)
                ->where('date', $date)
                ->where('start_time', $startTime)
                ->where('end_time', $endTime)
                ->where('id', '!=', $availableSlot->id)
                ->exists();

            if ($exists) {
                return response()->json(['message' => 'Ya existe un horario idéntico para este doctor.'], 422);
            }
        }

        // Formatear tiempos con segundos
        if (isset($data['start_time'])) {
            $data['start_time'] .= ':00';
        }
        if (isset($data['end_time'])) {
            $data['end_time'] .= ':00';
        }

        $availableSlot->update($data);

        return response()->json($availableSlot->load('doctor:id,first_name,first_last_name'));
    }

    public function destroy(AvailableSlot $availableSlot): JsonResponse
    {
        $availableSlot->delete();

        return response()->json(['message' => 'Slot eliminado.']);
    }

    public function destroyBatch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:available_slots,id',
        ]);

        $count = AvailableSlot::whereIn('id', $data['ids'])->delete();

        return response()->json(['message' => "{$count} horarios eliminados."]);
    }
}
