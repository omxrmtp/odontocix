<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('view', InventoryItem::class);

        $query = InventoryItem::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('supplier', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->boolean('low_stock')) {
            $query->whereColumn('quantity', '<=', 'min_stock');
        }

        $items = $query->orderBy('name')->paginate(30);

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', InventoryItem::class);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'required|string|in:insumos,equipos,medicamentos,otros',
            'sku' => 'nullable|string|max:255',
            'quantity' => 'nullable|integer|min:0',
            'min_stock' => 'nullable|integer|min:0',
            'unit' => 'required|string|max:255',
            'unit_cost' => 'nullable|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'expiration_date' => 'nullable|date',
        ]);

        $item = InventoryItem::create($data);

        return response()->json($item, 201);
    }

    public function show(InventoryItem $inventory): JsonResponse
    {
        $this->authorize('view', $inventory);

        $inventory->load([
            'movements' => function ($query) {
                $query->with('user:id,name')->latest()->limit(20);
            },
        ]);

        return response()->json($inventory);
    }

    public function update(Request $request, InventoryItem $inventory): JsonResponse
    {
        $this->authorize('update', $inventory);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'category' => 'sometimes|string|in:insumos,equipos,medicamentos,otros',
            'sku' => 'nullable|string|max:255',
            'min_stock' => 'sometimes|integer|min:0',
            'unit' => 'sometimes|string|max:255',
            'unit_cost' => 'nullable|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'expiration_date' => 'nullable|date',
        ]);

        $inventory->update($data);

        return response()->json($inventory);
    }

    public function destroy(InventoryItem $inventory): JsonResponse
    {
        $this->authorize('delete', $inventory);

        $inventory->delete();

        return response()->json(['message' => 'Artículo eliminado.']);
    }

    public function movement(Request $request, InventoryItem $inventory): JsonResponse
    {
        $this->authorize('update', $inventory);

        $data = $request->validate([
            'type' => 'required|in:entry,exit,adjustment',
            'quantity' => 'required|integer|min:1',
            'reason' => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($inventory, $data) {
            $movement = InventoryMovement::create([
                'inventory_item_id' => $inventory->id,
                'type' => $data['type'],
                'quantity' => $data['quantity'],
                'reason' => $data['reason'] ?? null,
                'user_id' => auth()->id(),
            ]);

            if ($data['type'] === 'entry') {
                $inventory->increment('quantity', $data['quantity']);
            } elseif ($data['type'] === 'exit') {
                if ($inventory->quantity < $data['quantity']) {
                    throw new \RuntimeException('Stock insuficiente para registrar la salida.');
                }
                $inventory->decrement('quantity', $data['quantity']);
            } elseif ($data['type'] === 'adjustment') {
                $inventory->update(['quantity' => $data['quantity']]);
            }

            return $movement;
        });

        return response()->json([
            'message' => 'Movimiento registrado.',
            'item' => $inventory->fresh(),
        ]);
    }

    public function lowStock(): JsonResponse
    {
        $this->authorize('view', InventoryItem::class);

        $items = InventoryItem::whereColumn('quantity', '<=', 'min_stock')
            ->orderBy('name')
            ->get();

        return response()->json($items);
    }
}
