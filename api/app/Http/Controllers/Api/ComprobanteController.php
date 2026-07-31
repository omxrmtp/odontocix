<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendComprobante;
use App\Models\Comprobante;
use App\Models\Payment;
use App\Services\ComprobanteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ComprobanteController extends Controller
{
    public function __construct(private ComprobanteService $comprobanteService) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('view', Payment::class);

        $comprobantes = Comprobante::with('patient:id,first_name,first_last_name', 'payment:id,amount')
            ->when($request->estado, fn ($q) => $q->where('estado', $request->estado))
            ->when($request->tipo_doc, fn ($q) => $q->where('tipo_doc', $request->tipo_doc))
            ->when($request->search, function ($q) use ($request) {
                $q->where(function ($inner) use ($request) {
                    $inner->where('serie', 'like', "%{$request->search}%")
                        ->orWhere('correlativo', 'like', "%{$request->search}%")
                        ->orWhere('doc_number', 'like', "%{$request->search}%")
                        ->orWhere('name', 'like', "%{$request->search}%");
                });
            })
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($comprobantes);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Payment::class);

        $data = $request->validate([
            'payment_id' => 'required|exists:payments,id',
            'tipo_doc' => 'required|in:'.Comprobante::TIPO_BOLETA.','.Comprobante::TIPO_FACTURA,
            'doc_number' => 'nullable|string|max:20',
            'name' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
        ]);

        $payment = Payment::with('patient', 'budget.items')->findOrFail($data['payment_id']);

        if ($data['tipo_doc'] === Comprobante::TIPO_FACTURA) {
            if (empty($data['doc_number']) || empty($data['name'])) {
                return response()->json([
                    'message' => 'Para emitir una Factura se requiere RUC y Razón Social.',
                ], 422);
            }
        }

        $receptor = $data['tipo_doc'] === Comprobante::TIPO_FACTURA
            ? [
                'doc_number' => $data['doc_number'],
                'name' => $data['name'],
                'address' => $data['address'] ?? null,
            ]
            : [];

        $comprobante = $this->comprobanteService->createFromPayment($payment, $data['tipo_doc'], $receptor);

        return response()->json($comprobante->load('patient', 'payment'), 201);
    }

    public function show(Comprobante $comprobante): JsonResponse
    {
        $this->authorize('view', Payment::class);

        return response()->json($comprobante->load('patient', 'payment', 'budget'));
    }

    public function resend(Comprobante $comprobante): JsonResponse
    {
        $this->authorize('create', Payment::class);

        if (! in_array($comprobante->estado, [Comprobante::ESTADO_RECHAZADO, Comprobante::ESTADO_ERROR])) {
            return response()->json(['message' => 'Solo se pueden reenviar comprobantes rechazados o con error.'], 422);
        }

        SendComprobante::dispatch($comprobante->id);

        return response()->json(['message' => 'Comprobante reencolado para envío.']);
    }

    public function downloadXml(Comprobante $comprobante): BinaryFileResponse|JsonResponse
    {
        $this->authorize('view', Payment::class);

        if (! $comprobante->xml_path || ! Storage::exists($comprobante->xml_path)) {
            return response()->json(['message' => 'XML no disponible.'], 404);
        }

        return Storage::download($comprobante->xml_path, $comprobante->serie.'-'.$comprobante->correlativo.'.xml');
    }

    public function downloadCdr(Comprobante $comprobante): BinaryFileResponse|JsonResponse
    {
        $this->authorize('view', Payment::class);

        if (! $comprobante->cdr_zip_path || ! Storage::exists($comprobante->cdr_zip_path)) {
            return response()->json(['message' => 'CDR no disponible.'], 404);
        }

        return Storage::download($comprobante->cdr_zip_path, 'R-'.$comprobante->serie.'-'.$comprobante->correlativo.'.zip');
    }
}
