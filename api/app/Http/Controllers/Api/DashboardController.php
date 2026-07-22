<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\BudgetItem;
use App\Models\CashTransaction;
use App\Models\Patient;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $now = now();
        $today = $now->copy()->startOfDay();

        $patientsToday = Patient::whereDate('created_at', $today)->count();

        $appointmentsToday = Appointment::whereDate('start_date', $today)->count();

        $appointmentsUpcoming = Appointment::where('start_date', '>', $now)->count();

        $incomeToday = Payment::whereDate('payment_date', $today)->sum('amount');

        $incomeMonth = Payment::whereMonth('payment_date', $now->month)
            ->whereYear('payment_date', $now->year)
            ->sum('amount');

        $expensesMonth = CashTransaction::where('type', 'expense')
            ->whereMonth('transaction_date', $now->month)
            ->whereYear('transaction_date', $now->year)
            ->sum('amount');

        $topTreatments = BudgetItem::select('treatment_id', DB::raw('count(*) as count'))
            ->with('treatment:id,name')
            ->groupBy('treatment_id')
            ->orderByDesc('count')
            ->limit(5)
            ->get()
            ->map(fn ($item) => [
                'name' => $item->treatment->name,
                'count' => $item->count,
            ]);

        $recentAppointments = Appointment::with([
            'patient:id,first_name,first_last_name',
            'doctor:id,first_name,first_last_name',
        ])
            ->latest('start_date')
            ->limit(5)
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'start_date' => $a->start_date,
                'status' => $a->status,
                'patient' => $a->patient?->first_name . ' ' . $a->patient?->first_last_name,
                'doctor' => $a->doctor?->first_name . ' ' . $a->doctor?->first_last_name,
            ]);

        $recentPayments = Payment::with([
            'patient:id,first_name,first_last_name',
        ])
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'amount' => $p->amount,
                'payment_date' => $p->payment_date,
                'method' => $p->method,
                'patient' => $p->patient?->first_name . ' ' . $p->patient?->first_last_name,
                'budget_id' => $p->budget_id,
            ]);

        return response()->json([
            'patients_today' => $patientsToday,
            'appointments_today' => $appointmentsToday,
            'appointments_upcoming' => $appointmentsUpcoming,
            'income_today' => $incomeToday,
            'income_month' => $incomeMonth,
            'expenses_month' => $expensesMonth,
            'balance' => $incomeMonth - $expensesMonth,
            'top_treatments' => $topTreatments,
            'recent_appointments' => $recentAppointments,
            'recent_payments' => $recentPayments,
        ]);
    }

    public function charts(): JsonResponse
    {
        $now = now();

        $appointmentsByDay = Appointment::where('start_date', '>=', $now->copy()->subDays(30)->startOfDay())
            ->select(DB::raw('DATE(start_date) as date'), DB::raw('count(*) as count'))
            ->groupBy(DB::raw('DATE(start_date)'))
            ->orderBy('date')
            ->get();

        $startMonth = $now->copy()->subMonths(11)->startOfMonth();

        $payments = Payment::where('payment_date', '>=', $startMonth)->get(['payment_date', 'amount']);
        $expenses = CashTransaction::where('type', 'expense')
            ->where('transaction_date', '>=', $startMonth)
            ->get(['transaction_date', 'amount']);

        $incomeByMonth = $payments->groupBy(fn ($p) => $p->payment_date->format('Y-m'))
            ->map(fn ($items) => $items->sum('amount'));

        $expensesByMonth = $expenses->groupBy(fn ($e) => $e->transaction_date->format('Y-m'))
            ->map(fn ($items) => $items->sum('amount'));

        $months = collect();
        for ($i = 11; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i)->format('Y-m');
            $months->push([
                'month' => $month,
                'income' => (float) ($incomeByMonth->get($month) ?? 0),
                'expenses' => (float) ($expensesByMonth->get($month) ?? 0),
            ]);
        }

        $incomeByCategory = Payment::whereMonth('payment_date', $now->month)
            ->whereYear('payment_date', $now->year)
            ->select('method', DB::raw('count(*) as count'), DB::raw('SUM(amount) as total'))
            ->groupBy('method')
            ->get()
            ->map(fn ($item) => [
                'method' => $item->method,
                'count' => $item->count,
                'total' => (float) $item->total,
            ]);

        return response()->json([
            'appointments_by_day' => $appointmentsByDay,
            'income_by_month' => $months,
            'income_by_category' => $incomeByCategory,
        ]);
    }
}
