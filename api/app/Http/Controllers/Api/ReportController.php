<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\BudgetItem;
use App\Models\CashTransaction;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\PatientTreatment;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ReportController extends Controller
{
    public function incomeReport(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
            'group_by' => 'required|in:day,week,month',
        ])->validate();

        $from = $validated['from'];
        $to = $validated['to'];
        $groupBy = $validated['group_by'];

        $getPeriod = fn (\Carbon\Carbon $date) => match ($groupBy) {
            'day' => $date->format('Y-m-d'),
            'week' => $date->format('Y') . '-W' . $date->format('W'),
            'month' => $date->format('Y-m'),
        };

        $payments = Payment::whereBetween('payment_date', [$from, $to])
            ->get(['payment_date', 'amount', 'method']);

        $expenses = CashTransaction::where('type', 'expense')
            ->whereBetween('transaction_date', [$from, $to])
            ->get(['transaction_date', 'amount']);

        $incomeByPeriod = $payments->groupBy(fn ($p) => $getPeriod($p->payment_date))
            ->map(fn ($items) => $items->sum('amount'));

        $expensesByPeriod = $expenses->groupBy(fn ($e) => $getPeriod($e->transaction_date))
            ->map(fn ($items) => $items->sum('amount'));

        $methodsByPeriod = $payments->groupBy(fn ($p) => $getPeriod($p->payment_date))
            ->map(fn ($items) => $items->groupBy('method')
                ->map(fn ($methodItems, $method) => [
                    'method' => $method,
                    'total' => (float) $methodItems->sum('amount'),
                    'count' => (int) $methodItems->count(),
                ])->values()
            );

        $periods = $incomeByPeriod->keys()->merge($expensesByPeriod->keys())->unique()->sort()->values();

        $data = $periods->map(fn ($period) => [
            'date' => $period,
            'total_income' => (float) ($incomeByPeriod->get($period) ?? 0),
            'total_expenses' => (float) ($expensesByPeriod->get($period) ?? 0),
            'net_balance' => (float) (($incomeByPeriod->get($period) ?? 0) - ($expensesByPeriod->get($period) ?? 0)),
            'payment_methods' => $methodsByPeriod->get($period, []),
        ]);

        return response()->json([
            'from' => $from,
            'to' => $to,
            'group_by' => $groupBy,
            'data' => $data->values(),
        ]);
    }

    public function treatmentReport(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
        ])->validate();

        $from = $validated['from'];
        $to = $validated['to'];

        $data = BudgetItem::query()
            ->join('budgets', 'budget_items.budget_id', '=', 'budgets.id')
            ->join('treatments', 'budget_items.treatment_id', '=', 'treatments.id')
            ->whereBetween('budgets.created_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
            ->select(
                'treatments.name as treatment_name',
                DB::raw('SUM(budget_items.quantity) as quantity'),
                DB::raw('SUM(budget_items.subtotal) as revenue'),
                DB::raw('AVG(budget_items.unit_price) as avg_price')
            )
            ->groupBy('treatments.id', 'treatments.name')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn ($item) => [
                'treatment_name' => $item->treatment_name,
                'quantity' => (int) $item->quantity,
                'revenue' => (float) $item->revenue,
                'avg_price' => (float) round($item->avg_price, 2),
            ]);

        return response()->json([
            'from' => $from,
            'to' => $to,
            'data' => $data,
        ]);
    }

    public function doctorProductivity(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
        ])->validate();

        $from = $validated['from'];
        $to = $validated['to'];

        $doctors = Doctor::all();

        $data = $doctors->map(function ($doctor) use ($from, $to) {
            $appointmentsCount = Appointment::where('doctor_id', $doctor->id)
                ->whereBetween('start_date', [$from . ' 00:00:00', $to . ' 23:59:59'])
                ->count();

            $treatmentsCompleted = PatientTreatment::where('doctor_id', $doctor->id)
                ->whereBetween('created_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
                ->where('status', 'completado')
                ->count();

            $revenueGenerated = PatientTreatment::where('doctor_id', $doctor->id)
                ->whereBetween('created_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
                ->sum('agreed_price');

            return [
                'doctor_name' => trim("{$doctor->first_name} {$doctor->first_last_name}"),
                'appointments_count' => $appointmentsCount,
                'treatments_completed' => $treatmentsCompleted,
                'revenue_generated' => (float) $revenueGenerated,
            ];
        })->sortByDesc('revenue_generated')->values();

        return response()->json([
            'from' => $from,
            'to' => $to,
            'data' => $data,
        ]);
    }

    public function patientRetention(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
        ])->validate();

        $from = $validated['from'];
        $to = $validated['to'];

        $newPatients = Patient::whereBetween('created_at', [$from . ' 00:00:00', $to . ' 23:59:59'])->count();

        $returningPatients = Patient::whereDate('created_at', '<', $from)
            ->whereHas('appointments', function ($query) use ($from, $to) {
                $query->whereBetween('start_date', [$from . ' 00:00:00', $to . ' 23:59:59']);
            })
            ->count();

        $totalActive = $newPatients + $returningPatients;
        $retentionRate = $totalActive > 0 ? round(($returningPatients / $totalActive) * 100, 2) : 0;

        return response()->json([
            'from' => $from,
            'to' => $to,
            'new_patients' => $newPatients,
            'returning_patients' => $returningPatients,
            'retention_rate' => $retentionRate,
        ]);
    }
}
