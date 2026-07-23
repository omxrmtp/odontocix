<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\BudgetItem;
use App\Models\CashTransaction;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('view', Budget::class);

        $budgets = Budget::with('patient:id,dni,first_name,first_last_name')
            ->when($request->patient_id, fn ($q) => $q->where('patient_id', $request->patient_id))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($budgets);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Budget::class);

        $data = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'items' => 'required|array|min:1',
            'items.*.treatment_id' => 'nullable|exists:treatments,id',
            'items.*.description' => 'required|string',
            'items.*.tooth_fdi' => 'nullable|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'discount_type' => 'nullable|in:percentage,fixed',
            'discount_value' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'financing' => 'nullable|array',
            'financing.type' => 'required_with:financing|in:contado,cuotas',
            'financing.n_cuotas' => 'required_if:financing.type,cuotas|integer|min:1',
            'financing.monto_cuota' => 'nullable|numeric|min:0',
        ]);

        $subtotal = collect($data['items'])->sum(fn ($i) => $i['quantity'] * $i['unit_price']);
        $discountType = $data['discount_type'] ?? null;
        $discountValue = $data['discount_value'] ?? 0;

        if ($discountType === 'percentage') {
            $discountPercent = min($discountValue, 100);
            $discountAmount = $subtotal * ($discountPercent / 100);
        } elseif ($discountType === 'fixed') {
            $discountPercent = $subtotal > 0 ? round(($discountValue / $subtotal) * 100, 2) : 0;
            $discountAmount = min($discountValue, $subtotal);
        } else {
            $discountPercent = 0;
            $discountAmount = 0;
        }
        $grandTotal = $subtotal - $discountAmount;

        $budget = Budget::create([
            'patient_id' => $data['patient_id'],
            'total' => $subtotal,
            'discount_percent' => $discountPercent,
            'discount_amount' => $discountAmount,
            'grand_total' => $grandTotal,
            'status' => 'draft',
            'financing' => $data['financing'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        foreach ($data['items'] as $item) {
            BudgetItem::create([
                'budget_id' => $budget->id,
                'treatment_id' => $item['treatment_id'] ?? null,
                'description' => $item['description'],
                'tooth_fdi' => $item['tooth_fdi'] ?? null,
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'subtotal' => $item['quantity'] * $item['unit_price'],
            ]);
        }

        return response()->json(
            $budget->load('items', 'patient', 'payments'),
            201
        );
    }

    public function show(Budget $budget): JsonResponse
    {
        $this->authorize('view', $budget);

        return response()->json(
            $budget->load(['items.treatment', 'patient', 'payments'])
        );
    }

    public function update(Request $request, Budget $budget): JsonResponse
    {
        $this->authorize('update', $budget);

        $data = $request->validate([
            'status' => 'sometimes|in:draft,sent,approved,rejected,converted',
            'notes' => 'nullable|string',
            'financing' => 'nullable|array',
            'discount_type' => 'nullable|in:percentage,fixed',
            'discount_value' => 'nullable|numeric|min:0',
        ]);

        if (array_key_exists('discount_type', $data) || array_key_exists('discount_value', $data)) {
            $discountType = $data['discount_type'] ?? null;
            $discountValue = $data['discount_value'] ?? 0;
            $subtotal = $budget->total;

            if ($discountType === 'percentage') {
                $discountPercent = min($discountValue, 100);
                $discountAmount = $subtotal * ($discountPercent / 100);
            } elseif ($discountType === 'fixed') {
                $discountPercent = $subtotal > 0 ? round(($discountValue / $subtotal) * 100, 2) : 0;
                $discountAmount = min($discountValue, $subtotal);
            } else {
                $discountPercent = 0;
                $discountAmount = 0;
            }
            $grandTotal = $subtotal - $discountAmount;

            $budget->update([
                'discount_percent' => $discountPercent,
                'discount_amount' => $discountAmount,
                'grand_total' => $grandTotal,
                'status' => $data['status'] ?? $budget->status,
                'notes' => $data['notes'] ?? $budget->notes,
                'financing' => $data['financing'] ?? $budget->financing,
            ]);
        } else {
            $budget->update($data);
        }

        return response()->json($budget->load('items', 'patient', 'payments'));
    }

    public function destroy(Budget $budget): JsonResponse
    {
        $this->authorize('delete', $budget);

        $budget->items()->delete();
        $budget->delete();

        return response()->json(['message' => 'Presupuesto eliminado.']);
    }
}
