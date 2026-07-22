<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Historia Clínica #{{ $patient->id }}</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; color: #333; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #7c3aed; padding-bottom: 15px; }
        .header h1 { font-size: 20px; color: #7c3aed; margin: 0 0 5px; }
        .header p { margin: 2px 0; color: #555; font-size: 11px; }
        .section { margin-bottom: 20px; page-break-inside: avoid; }
        .section-title { font-size: 14px; font-weight: bold; color: #6d28d9; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        .patient-data { width: 100%; }
        .patient-data td { padding: 3px 8px; font-size: 11px; vertical-align: top; }
        .patient-data td:first-child { font-weight: bold; width: 25%; color: #555; }
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        table.data-table th { background: #7c3aed; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; }
        table.data-table td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
        table.data-table tr:nth-child(even) td { background: #faf5ff; }
        .odontogram { margin-top: 10px; }
        .odontogram-grid { display: flex; flex-wrap: wrap; gap: 4px; }
        .tooth-box { display: inline-block; width: 32px; height: 32px; line-height: 32px; text-align: center; font-size: 9px; font-weight: bold; border: 1px solid #ccc; border-radius: 4px; margin: 2px; }
        .tooth-healthy { background: #d1fae5; border-color: #86efac; color: #065f46; }
        .tooth-caries { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
        .tooth-treatment { background: #dbeafe; border-color: #93c5fd; color: #1e40af; }
        .tooth-extracted { background: #e5e7eb; border-color: #9ca3af; color: #4b5563; }
        .tooth-prosthesis { background: #fef3c7; border-color: #fcd34d; color: #92400e; }
        .tooth-other { background: #f3e8ff; border-color: #c4b5fd; color: #5b21b6; }
        .legend { font-size: 9px; margin-top: 8px; color: #555; }
        .legend span { display: inline-block; margin-right: 10px; }
        .legend .dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 3px; vertical-align: middle; }
        .footer { text-align: center; color: #999; font-size: 9px; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 25px; }
        .page-break { page-break-before: always; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $tenant->name ?? 'Clínica Dental' }}</h1>
        @if ($tenant->ruc)<p><strong>RUC:</strong> {{ $tenant->ruc }}</p>@endif
        @if ($tenant->address)<p>{{ $tenant->address }}</p>@endif
        @if ($tenant->phone)<p>Tel: {{ $tenant->phone }}</p>@endif
        @if ($tenant->email)<p>{{ $tenant->email }}</p>@endif
        <p style="margin-top:8px; font-size:14px; color:#7c3aed;"><strong>HISTORIA CLÍNICA - PACIENTE #{{ $patient->id }}</strong></p>
    </div>

    <div class="section">
        <div class="section-title">Datos del Paciente</div>
        <table class="patient-data">
            <tr>
                <td>Nombre Completo:</td>
                <td>{{ $patient->first_name ?? '' }} {{ $patient->second_name ?? '' }} {{ $patient->first_last_name ?? '' }} {{ $patient->second_last_name ?? '' }}</td>
                <td style="width:25%;">DNI:</td>
                <td>{{ $patient->dni ?? '-' }}</td>
            </tr>
            <tr>
                <td>Fecha de Nacimiento:</td>
                <td>{{ $patient->birth_date ? $patient->birth_date->format('d/m/Y') : '-' }}</td>
                <td>Edad:</td>
                <td>{{ $patient->birth_date ? $patient->birth_date->age . ' años' : '-' }}</td>
            </tr>
            <tr>
                <td>Sexo:</td>
                <td>{{ ['M' => 'Masculino', 'F' => 'Femenino', 'O' => 'Otro'][$patient->gender] ?? $patient->gender ?? '-' }}</td>
                <td>Tipo de Sangre:</td>
                <td>{{ $patient->blood_type ?? '-' }}</td>
            </tr>
            @if ($patient->phone)
            <tr><td>Teléfono:</td><td>{{ $patient->phone }}</td><td></td><td></td></tr>
            @endif
            @if ($patient->email)
            <tr><td>Email:</td><td colspan="3">{{ $patient->email }}</td></tr>
            @endif
            @if ($patient->address)
            <tr><td>Dirección:</td><td colspan="3">{{ $patient->address }}</td></tr>
            @endif
            @if ($patient->observations)
            <tr><td>Observaciones:</td><td colspan="3">{{ $patient->observations }}</td></tr>
            @endif
        </table>
    </div>

    @if ($clinicalRecords->isNotEmpty())
    <div class="section">
        <div class="section-title">Registros Clínicos</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width:70px;">Fecha</th>
                    <th style="width:120px;">Doctor</th>
                    <th>Motivo</th>
                    <th>Diagnóstico</th>
                    <th>Observaciones</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($clinicalRecords as $record)
                <tr>
                    <td>{{ $record->record_date ? $record->record_date->format('d/m/Y') : '-' }}</td>
                    <td>{{ $record->doctor ? $record->doctor->first_name . ' ' . $record->doctor->first_last_name . ($record->doctor->cmp ? ' (CMP: ' . $record->doctor->cmp . ')' : '') : '-' }}</td>
                    <td>{{ $record->reason ?? '-' }}</td>
                    <td>{{ $record->diagnosis ?? '-' }}</td>
                    <td>{{ $record->notes ?? '-' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    @if ($treatments->isNotEmpty())
    <div class="section">
        <div class="section-title">Tratamientos</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>Tratamiento</th>
                    <th style="width:60px;">Diente</th>
                    <th style="width:70px;">Estado</th>
                    <th style="width:70px;text-align:right;">Precio</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($treatments as $pt)
                <tr>
                    <td>{{ $loop->iteration }}</td>
                    <td>{{ $pt->treatment->name ?? '-' }}</td>
                    <td>{{ $pt->tooth_fdi ?? '-' }}</td>
                    <td>{{ ['pending' => 'Pendiente', 'in_progress' => 'En progreso', 'completed' => 'Completado', 'cancelled' => 'Cancelado'][$pt->status] ?? $pt->status ?? '-' }}</td>
                    <td style="text-align:right;">{{ $pt->agreed_price !== null ? 'S/ ' . number_format($pt->agreed_price, 2) : '-' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    @if ($teethRecords->isNotEmpty())
    <div class="section page-break">
        <div class="section-title">Odontograma</div>
        <div class="odontogram">
            @php
                $statusColors = [
                    'sano' => 'tooth-healthy',
                    'caries' => 'tooth-caries',
                    'ausente' => 'tooth-other',
                    'implante' => 'tooth-prosthesis',
                    'corona' => 'tooth-treatment',
                    'endodoncia' => 'tooth-treatment',
                    'extraccion' => 'tooth-extracted',
                    'puente' => 'tooth-prosthesis',
                    'protesis' => 'tooth-prosthesis',
                ];
                $teethByFdi = $teethRecords->keyBy('fdi_code');
                $quadrants = [
                    '18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28',
                    '48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38',
                ];
            @endphp
            <div style="text-align:center;">
                @foreach ($quadrants as $i => $fdiCode)
                    @php
                        $record = $teethByFdi->get($fdiCode);
                        $cssClass = 'tooth-other';
                        if ($record && isset($statusColors[$record->status])) {
                            $cssClass = $statusColors[$record->status];
                        } elseif (!$record) {
                            $cssClass = 'tooth-healthy';
                        }
                        $displayCode = $fdiCode;
                    @endphp
                    <span class="tooth-box {{ $cssClass }}" title="FDI {{ $fdiCode }}{{ $record && $record->notes ? ': ' . $record->notes : '' }}">
                        {{ $displayCode }}
                    </span>
                    @if ($i === 15 || $i === 31)
                        <br style="margin-bottom:6px;">
                    @endif
                @endforeach
            </div>
            <div class="legend">
                <span><span class="dot" style="background:#d1fae5;border:1px solid #86efac;"></span> Sano</span>
                <span><span class="dot" style="background:#fee2e2;border:1px solid #fca5a5;"></span> Caries</span>
                <span><span class="dot" style="background:#dbeafe;border:1px solid #93c5fd;"></span> Tratamiento</span>
                <span><span class="dot" style="background:#e5e7eb;border:1px solid #9ca3af;"></span> Extraído</span>
                <span><span class="dot" style="background:#fef3c7;border:1px solid #fcd34d;"></span> Prótesis</span>
                <span><span class="dot" style="background:#f3e8ff;border:1px solid #c4b5fd;"></span> Otro</span>
            </div>
        </div>
    </div>
    @endif

    <div class="footer">
        Documento generado electrónicamente
    </div>
</body>
</html>
