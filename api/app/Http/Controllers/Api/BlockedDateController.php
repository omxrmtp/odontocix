<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlockedDate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BlockedDateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $dates = BlockedDate::query()
            ->when($request->start, fn ($q) => $q->where('date', '>=', $request->start))
            ->when($request->end, fn ($q) => $q->where('date', '<=', $request->end))
            ->orderBy('date', 'desc')
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'date' => $d->date,
                'reason' => $d->reason,
                'created_at' => $d->created_at,
            ]);

        return response()->json($dates);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => 'required|date',
            'reason' => 'nullable|string|max:255',
        ]);

        $blocked = BlockedDate::create([
            'date' => $data['date'],
            'reason' => $data['reason'] ?? null,
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'id' => $blocked->id,
            'date' => $blocked->date,
            'reason' => $blocked->reason,
        ], 201);
    }

    public function destroy(BlockedDate $blockedDate): JsonResponse
    {
        $blockedDate->delete();

        return response()->json(['message' => 'Fecha desbloqueada.']);
    }
}
