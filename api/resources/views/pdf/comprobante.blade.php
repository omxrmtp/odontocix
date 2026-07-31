<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $comprobante->serie }}-{{ $comprobante->correlativo }}</title>
    <style>
        body { font-family: sans-serif; font-size: 11px; color: #333; margin: 0; padding: 0; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #16a34a; padding-bottom: 12px; }
        .header .brand h1 { font-size: 17px; color: #16a34a; margin: 0 0 3px; }
        .header .brand p { margin: 1px 0; color: #555; font-size: 10px; }
        .header .doc-title { text-align: center; }
        .header .doc-title h2 { font-size: 15px; color: #166534; margin: 0; letter-spacing: 2px; }
        .header .doc-title p { margin: 3px 0 0; font-size: 14px; font-weight: bold; }
        .sections { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .section { width: 48%; }
        .section table { width: 100%; }
        .section td { padding: 2px 4px; font-size: 10px; }
        .section td:first-child { font-weight: bold; color: #555; width: 40%; }
        .items { margin: 10px 0 15px; }
        .items table { width: 100%; border-collapse: collapse; }
        .items th { background: #f0fdf4; color: #166534; padding: 6px 8px; font-size: 10px; text-align: left; border: 1px solid #bbf7d0; }
        .items td { padding: 5px 8px; font-size: 10px; border: 1px solid #e5e7eb; }
        .items td.right { text-align: right; }
        .totals { margin-left: auto; width: 55%; }
        .totals table { width: 100%; }
        .totals td { padding: 3px 8px; font-size: 11px; }
        .totals td:first-child { color: #555; }
        .totals .grand td { font-size: 14px; font-weight: bold; color: #166534; border-top: 2px solid #16a34a; padding-top: 6px; }
        .qr-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; }
        .footer { text-align: center; color: #999; font-size: 8px; border-top: 1px solid #ddd; padding-top: 8px; margin-top: 15px; }
        .estado { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 9px; font-weight: bold; }
        .estado.aceptado { background: #dcfce7; color: #166534; }
        .estado.observaciones { background: #fef9c3; color: #854d0e; }
        .estado.rechazado { background: #fee2e2; color: #991b1b; }
        .legend { font-size: 9px; color: #555; margin-top: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">
            <h1>{{ $tenant->name ?? 'Clínica Dental' }}</h1>
            @if ($tenant->ruc)<p><strong>RUC:</strong> {{ $tenant->ruc }}</p>@endif
            @if ($tenant->address)<p>{{ $tenant->address }}</p>@endif
            @if ($tenant->phone)<p>Tel: {{ $tenant->phone }}</p>@endif
        </div>
        <div class="doc-title">
            <h2>{{ $comprobante->tipo_doc_label }}</h2>
            <p>{{ $comprobante->serie }}-{{ str_pad((string) $comprobante->correlativo, 8, '0', STR_PAD_LEFT) }}</p>
            <p style="font-size: 9px; color: #555; margin-top: 4px;">
                Estado:
                @php($estadoClass = match($comprobante->estado) {
                    'aceptado' => 'aceptado',
                    'aceptado_con_observaciones' => 'observaciones',
                    'rechazado' => 'rechazado',
                    default => 'observaciones',
                })
                <span class="estado {{ $estadoClass }}">{{ $comprobante->estado_label }}</span>
            </p>
        </div>
    </div>

    <div class="sections">
        <div class="section">
            <table>
                <tr><td>Fecha de emisión:</td><td>{{ $comprobante->created_at ? $comprobante->created_at->format('d/m/Y') : '-' }}</td></tr>
                <tr><td>Tipo moneda:</td><td>SOLES</td></tr>
                <tr><td>Método de pago:</td><td>Contado</td></tr>
            </table>
        </div>
        <div class="section">
            <table>
                <tr><td>Cliente:</td><td>{{ $comprobante->name ?? '-' }}</td></tr>
                <tr><td>{{ $comprobante->doc_type === '6' ? 'RUC' : 'DNI' }}:</td><td>{{ $comprobante->doc_number ?? '-' }}</td></tr>
                @if ($comprobante->address)<tr><td>Dirección:</td><td>{{ $comprobante->address }}</td></tr>@endif
            </table>
        </div>
    </div>

    <div class="items">
        <table>
            <thead>
                <tr>
                    <th style="width:5%">#</th>
                    <th>Cant.</th>
                    <th>Descripción</th>
                    <th class="right">V. Unitario</th>
                    <th class="right">Importe</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($comprobante->payment?->budget?->items ?? [] as $index => $item)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $item->quantity }}</td>
                    <td>{{ $item->description }}</td>
                    <td class="right">S/ {{ number_format((float) $item->unit_price, 2) }}</td>
                    <td class="right">S/ {{ number_format((float) $item->subtotal, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="totals">
        <table>
            <tr><td>Op. Gravadas:</td><td class="right">S/ {{ number_format((float) $comprobante->mto_oper_gravadas, 2) }}</td></tr>
            <tr><td>IGV (18%):</td><td class="right">S/ {{ number_format((float) $comprobante->mto_igv, 2) }}</td></tr>
            <tr><td>Total Impuestos:</td><td class="right">S/ {{ number_format((float) $comprobante->total_impuestos, 2) }}</td></tr>
            <tr class="grand"><td>IMPORTE TOTAL:</td><td class="right">S/ {{ number_format((float) $comprobante->mto_imp_venta, 2) }}</td></tr>
        </table>
    </div>

    <div class="qr-row">
        <div>
            <div class="legend">Representación impresa de la factura electrónica</div>
            <div class="legend">Resolución: Ver SUNAT (www.sunat.gob.pe)</div>
            <div class="legend">Clave Hash: {{ $comprobante->hash ?? '-' }}</div>
        </div>
        @if ($qr)
            <img src="{{ $qr }}" width="90" height="90" alt="QR">
        @endif
    </div>

    <div class="footer">
        Documento generado electrónicamente mediante SUNAT · {{ $comprobante->serie }}-{{ str_pad((string) $comprobante->correlativo, 8, '0', STR_PAD_LEFT) }}
    </div>
</body>
</html>
