<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Presupuesto #{{ $budget->id }}</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; color: #333; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 15px; }
        .header h1 { font-size: 20px; color: #2563eb; margin: 0 0 5px; }
        .header p { margin: 2px 0; color: #555; font-size: 11px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 14px; font-weight: bold; color: #1e40af; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        .info-grid { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .info-box { width: 48%; }
        .info-box table { width: 100%; }
        .info-box td { padding: 2px 5px; font-size: 11px; }
        .info-box td:first-child { font-weight: bold; width: 30%; color: #555; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        table.items th { background: #2563eb; color: #fff; padding: 7px 8px; text-align: left; font-size: 11px; }
        table.items td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
        table.items tr:nth-child(even) td { background: #f9fafb; }
        .totals { width: 300px; margin-left: auto; }
        .totals td { padding: 4px 8px; font-size: 11px; }
        .totals td:last-child { text-align: right; }
        .totals .grand-total td { font-weight: bold; font-size: 13px; color: #2563eb; border-top: 2px solid #2563eb; }
        .financing { background: #f0fdf4; border: 1px solid #86efac; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 11px; }
        .financing strong { color: #16a34a; }
        .notes { background: #fffbeb; border: 1px solid #fde68a; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 11px; }
        .footer { text-align: center; color: #999; font-size: 9px; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 25px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; }
        .badge-draft { background: #fef3c7; color: #92400e; }
        .badge-sent { background: #dbeafe; color: #1e40af; }
        .badge-approved { background: #d1fae5; color: #065f46; }
        .badge-converted { background: #e0e7ff; color: #3730a3; }
        .badge-rejected { background: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $tenant->name ?? 'Clínica Dental' }}</h1>
        @if ($tenant->ruc)<p><strong>RUC:</strong> {{ $tenant->ruc }}</p>@endif
        @if ($tenant->address)<p>{{ $tenant->address }}</p>@endif
        @if ($tenant->phone)<p>Tel: {{ $tenant->phone }}</p>@endif
        @if ($tenant->email)<p>{{ $tenant->email }}</p>@endif
        <p style="margin-top:8px; font-size:13px; color:#2563eb;"><strong>PRESUPUESTO #{{ $budget->id }}</strong></p>
    </div>

    <div class="section">
        <div class="section-title">Datos del Paciente</div>
        <div class="info-box">
            <table>
                <tr><td>Paciente:</td><td>{{ $patient->first_name ?? '' }} {{ $patient->second_name ?? '' }} {{ $patient->first_last_name ?? '' }} {{ $patient->second_last_name ?? '' }}</td></tr>
                @if ($patient->dni)<tr><td>DNI:</td><td>{{ $patient->dni }}</td></tr>@endif
                @if ($patient->phone)<tr><td>Teléfono:</td><td>{{ $patient->phone }}</td></tr>@endif
                @if ($patient->email)<tr><td>Email:</td><td>{{ $patient->email }}</td></tr>@endif
            </table>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Detalle del Presupuesto</div>
        <table class="items">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>Descripción</th>
                    <th style="width:60px;">Diente</th>
                    <th style="width:50px;text-align:center;">Cant.</th>
                    <th style="width:80px;text-align:right;">P. Unit.</th>
                    <th style="width:80px;text-align:right;">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($items as $item)
                <tr>
                    <td>{{ $loop->iteration }}</td>
                    <td>{{ $item->description }}{{ $item->treatment ? ' (' . $item->treatment->name . ')' : '' }}</td>
                    <td>{{ $item->tooth_fdi ?? '-' }}</td>
                    <td style="text-align:center;">{{ $item->quantity }}</td>
                    <td style="text-align:right;">S/ {{ number_format($item->unit_price, 2) }}</td>
                    <td style="text-align:right;">S/ {{ number_format($item->subtotal, 2) }}</td>
                </tr>
                @empty
                <tr><td colspan="6" style="text-align:center;color:#999;">Sin items</td></tr>
                @endforelse
            </tbody>
        </table>

        <table class="totals">
            <tr><td>Subtotal:</td><td>S/ {{ number_format($budget->total, 2) }}</td></tr>
            @if (($budget->discount_percent ?? 0) > 0)
            <tr><td>Descuento ({{ $budget->discount_percent }}%):</td><td>- S/ {{ number_format($budget->discount_amount, 2) }}</td></tr>
            @endif
            <tr class="grand-total"><td>Total:</td><td>S/ {{ number_format($budget->grand_total, 2) }}</td></tr>
        </table>
    </div>

    @if ($budget->financing)
    <div class="financing">
        <strong>Información de Financiamiento</strong><br>
        Tipo: {{ $budget->financing['type'] === 'cuotas' ? 'Cuotas' : 'Contado' }}<br>
        @if (($budget->financing['type'] ?? '') === 'cuotas')
        N° de cuotas: {{ $budget->financing['n_cuotas'] ?? '-' }}<br>
        @if (($budget->financing['monto_cuota'] ?? null) !== null)
        Monto por cuota: S/ {{ number_format($budget->financing['monto_cuota'], 2) }}
        @endif
        @endif
    </div>
    @endif

    @if ($budget->notes)
    <div class="notes">
        <strong>Notas:</strong><br>
        {{ $budget->notes }}
    </div>
    @endif

    <div class="footer">
        Documento generado electrónicamente
    </div>
</body>
</html>
