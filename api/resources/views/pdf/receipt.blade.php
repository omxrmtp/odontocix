<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Recibo #{{ $payment->id }}</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; color: #333; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #16a34a; padding-bottom: 15px; }
        .header h1 { font-size: 20px; color: #16a34a; margin: 0 0 5px; }
        .header h2 { font-size: 22px; letter-spacing: 3px; color: #166534; margin: 10px 0 5px; }
        .header p { margin: 2px 0; color: #555; font-size: 11px; }
        .info-grid { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .info-box { width: 48%; }
        .info-box table { width: 100%; }
        .info-box td { padding: 3px 5px; font-size: 11px; }
        .info-box td:first-child { font-weight: bold; width: 35%; color: #555; }
        .amount-box { text-align: center; background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .amount-box .amount { font-size: 28px; font-weight: bold; color: #16a34a; }
        .amount-box .label { font-size: 11px; color: #555; margin-bottom: 5px; }
        .details { margin: 15px 0; }
        .details table { width: 100%; }
        .details td { padding: 4px 8px; font-size: 11px; border-bottom: 1px solid #e5e7eb; }
        .details td:first-child { font-weight: bold; width: 30%; color: #555; }
        .notes { background: #fffbeb; border: 1px solid #fde68a; padding: 10px; border-radius: 4px; margin: 15px 0; font-size: 11px; }
        .footer { text-align: center; color: #999; font-size: 9px; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 25px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $tenant->name ?? 'Clínica Dental' }}</h1>
        @if ($tenant->ruc)<p><strong>RUC:</strong> {{ $tenant->ruc }}</p>@endif
        @if ($tenant->address)<p>{{ $tenant->address }}</p>@endif
        @if ($tenant->phone)<p>Tel: {{ $tenant->phone }}</p>@endif
        @if ($tenant->email)<p>{{ $tenant->email }}</p>@endif
        <h2>RECIBO DE PAGO</h2>
    </div>

    <div class="info-grid">
        <div class="info-box">
            <table>
                <tr><td>Recibo N°:</td><td>{{ $payment->id }}</td></tr>
                <tr><td>Fecha:</td><td>{{ $payment->payment_date ? $payment->payment_date->format('d/m/Y') : '-' }}</td></tr>
                <tr><td>Paciente:</td><td>{{ $patient->first_name ?? '' }} {{ $patient->second_name ?? '' }} {{ $patient->first_last_name ?? '' }} {{ $patient->second_last_name ?? '' }}</td></tr>
                @if ($patient->dni)<tr><td>DNI:</td><td>{{ $patient->dni }}</td></tr>@endif
            </table>
        </div>
        <div class="info-box">
            <table>
                <tr><td>Presupuesto Ref.:</td><td>#{{ $budget->id ?? '-' }}</td></tr>
                @if ($payment->reference)<tr><td>Referencia:</td><td>{{ $payment->reference }}</td></tr>@endif
                <tr><td>Método de Pago:</td><td>{{ ['cash' => 'Efectivo', 'card' => 'Tarjeta', 'transfer' => 'Transferencia', 'other' => 'Otros'][$payment->method] ?? $payment->method }}</td></tr>
            </table>
        </div>
    </div>

    <div class="amount-box">
        <div class="label">Monto Pagado</div>
        <div class="amount">S/ {{ number_format($payment->amount, 2) }}</div>
    </div>

    @if ($payment->notes)
    <div class="notes">
        <strong>Notas:</strong><br>
        {{ $payment->notes }}
    </div>
    @endif

    <div class="footer">
        Documento generado electrónicamente
    </div>
</body>
</html>
