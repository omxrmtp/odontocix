<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CashRegisterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('view', CashTransaction::class);

        $query = CashTransaction::query();

        if ($request->from) $query->whereDate('transaction_date', '>=', $request->from);
        if ($request->to) $query->whereDate('transaction_date', '<=', $request->to);
        if ($request->type) $query->where('type', $request->type);
        if ($request->category) $query->where('category', $request->category);

        $transactions = $query->with('user:id,name')
            ->orderBy('transaction_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(30);

        return response()->json($transactions);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', CashTransaction::class);

        $data = $request->validate([
            'type' => 'required|in:income,expense',
            'amount' => 'required|numeric|min:0.01',
            'category' => 'nullable|string|max:255',
            'concept' => 'required|string',
            'transaction_date' => 'required|date',
        ]);

        $transaction = CashTransaction::create($data);

        return response()->json($transaction, 201);
    }

    public function summary(Request $request): JsonResponse
    {
        $this->authorize('view', CashTransaction::class);

        $from = $request->from ?? now()->startOfMonth()->toDateString();
        $to = $request->to ?? now()->endOfMonth()->toDateString();

        $income = CashTransaction::where('type', 'income')
            ->whereDate('transaction_date', '>=', $from)
            ->whereDate('transaction_date', '<=', $to)
            ->sum('amount');

        $expenses = CashTransaction::where('type', 'expense')
            ->whereDate('transaction_date', '>=', $from)
            ->whereDate('transaction_date', '<=', $to)
            ->sum('amount');

        $byCategory = CashTransaction::whereDate('transaction_date', '>=', $from)
            ->whereDate('transaction_date', '<=', $to)
            ->selectRaw("type, category, sum(amount) as total")
            ->groupBy('type', 'category')
            ->get();

        return response()->json([
            'period' => ['from' => $from, 'to' => $to],
            'income' => $income,
            'expenses' => $expenses,
            'balance' => $income - $expenses,
            'by_category' => $byCategory,
        ]);
    }

    public function destroy(CashTransaction $transaction): JsonResponse
    {
        $this->authorize('delete', $transaction);

        $transaction->delete();

        return response()->json(['message' => 'Movimiento eliminado.']);
    }
}
