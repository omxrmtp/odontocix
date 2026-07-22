<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\CashTransaction;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('view', Payment::class);

        $payments = Payment::with('patient:id,dni,first_name,first_last_name', 'budget:id,grand_total')
            ->when($request->patient_id, fn ($q) => $q->where('patient_id', $request->patient_id))
            ->when($request->budget_id, fn ($q) => $q->where('budget_id', $request->budget_id))
            ->orderBy('payment_date', 'desc')
            ->paginate(20);

        return response()->json($payments);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Payment::class);

        $data = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'budget_id' => 'nullable|exists:budgets,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'method' => 'required|in:cash,card,transfer,other',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $payment = Payment::create($data);

        CashTransaction::create([
            'type' => 'income',
            'amount' => $data['amount'],
            'category' => 'pago_tratamiento',
            'concept' => 'Pago recibido - ' . ($data['reference'] ?? 'sin referencia'),
            'transaction_date' => $data['payment_date'],
            'payment_id' => $payment->id,
        ]);

        return response()->json($payment->load('patient', 'budget'), 201);
    }

    public function show(Payment $payment): JsonResponse
    {
        $this->authorize('view', $payment);

        return response()->json($payment->load('patient', 'budget.items'));
    }

    public function destroy(Payment $payment): JsonResponse
    {
        $this->authorize('delete', $payment);

        $payment->delete();

        return response()->json(['message' => 'Pago eliminado.']);
    }

    public function budgetBalance(Budget $budget): JsonResponse
    {
        $this->authorize('view', Payment::class);

        $totalPaid = $budget->payments()->sum('amount');

        return response()->json([
            'budget_id' => $budget->id,
            'grand_total' => $budget->grand_total,
            'total_paid' => $totalPaid,
            'balance' => $budget->grand_total - $totalPaid,
        ]);
    }
}
