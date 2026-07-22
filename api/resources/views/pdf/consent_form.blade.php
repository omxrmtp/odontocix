<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $form->title }}</title>
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
        .content { font-size: 12px; line-height: 1.6; margin-bottom: 20px; }
        .content ol { padding-left: 20px; }
        .content li { margin-bottom: 8px; }
        .signature-box { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px; }
        .signature-section { text-align: center; margin-top: 20px; }
        .signature-img { max-width: 300px; max-height: 120px; margin: 10px auto; display: block; }
        .signature-line { width: 300px; border-top: 1px solid #333; margin: 10px auto; padding-top: 5px; font-size: 11px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; }
        .badge-signed { background: #d1fae5; color: #065f46; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .footer { text-align: center; color: #999; font-size: 9px; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 25px; }
        .meta { font-size: 10px; color: #666; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $tenant->name ?? 'Clínica Dental' }}</h1>
        <p>{{ $tenant->address ?? '' }}</p>
        <p>{{ $tenant->phone ?? '' }} | {{ $tenant->email ?? '' }}</p>
    </div>

    <div class="section">
        <div class="section-title">Información del Paciente</div>
        <div class="info-grid">
            <div class="info-box">
                <table>
                    <tr><td>Paciente:</td><td>{{ $patient->first_name }} {{ $patient->first_last_name }}</td></tr>
                    <tr><td>DNI:</td><td>{{ $patient->dni }}</td></tr>
                    <tr><td>Teléfono:</td><td>{{ $patient->phone ?? 'N/A' }}</td></tr>
                </table>
            </div>
            <div class="info-box">
                <table>
                    <tr><td>Email:</td><td>{{ $patient->email ?? 'N/A' }}</td></tr>
                    <tr><td>Fecha de nacimiento:</td><td>{{ $patient->birth_date ? \Carbon\Carbon::parse($patient->birth_date)->format('d/m/Y') : 'N/A' }}</td></tr>
                </table>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">{{ $form->title }} <span style="float:right;" class="badge {{ $form->signed_at ? 'badge-signed' : 'badge-pending' }}">{{ $form->signed_at ? 'FIRMADO' : 'PENDIENTE' }}</span></div>
        <div class="content">
            {!! $content !!}
        </div>
    </div>

    @if($form->signed_at)
    <div class="signature-box">
        <div class="section-title">Firma y Datos del Consentimiento</div>
        <div class="signature-section">
            @if($form->signature_data)
                <img src="{{ $form->signature_data }}" class="signature-img" alt="Firma del paciente">
            @endif
            <div class="signature-line">
                Firma del {{ $form->signed_by_guardian ? 'Apoderado' : 'Paciente' }}: {{ $form->signed_by_guardian ? $form->guardian_name : ($patient->first_name . ' ' . $patient->first_last_name) }}
            </div>
            @if($form->signed_by_guardian)
            <div class="meta">DNI del apoderado: {{ $form->guardian_dni }}</div>
            @endif
            <div class="meta">Fecha de firma: {{ \Carbon\Carbon::parse($form->signed_at)->format('d/m/Y H:i:s') }}</div>
            <div class="meta">Dirección IP: {{ $form->ip_address ?? 'N/A' }}</div>
        </div>
    </div>
    @endif

    <div class="footer">
        <p>Documento generado el {{ now()->format('d/m/Y H:i:s') }} — OdontoCix</p>
    </div>
</body>
</html>
