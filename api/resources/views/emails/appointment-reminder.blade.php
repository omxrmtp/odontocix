<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recordatorio de Cita</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
        .detail { margin-bottom: 12px; }
        .label { font-weight: bold; color: #6b7280; }
        .footer { margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>OdontoCix</h1>
        <p>Recordatorio de cita</p>
    </div>
    <div class="content">
        <p>Hola {{ $appointment->patient->first_name }},</p>
        <p>Le recordamos su próxima cita:</p>

        <div class="detail">
            <span class="label">Fecha:</span> {{ $appointment->start_date->format('d/m/Y') }}
        </div>
        <div class="detail">
            <span class="label">Hora:</span> {{ $appointment->start_date->format('H:i') }}
        </div>
        <div class="detail">
            <span class="label">Doctor:</span> Dr. {{ $appointment->doctor?->first_last_name ?? 'Asignado' }}
        </div>
        <div class="detail">
            <span class="label">Motivo:</span> {{ $appointment->reason ?? 'consulta' }}
        </div>

        <p>Si necesita reprogramar, por favor contáctenos con anticipación.</p>
    </div>
    <div class="footer">
        <p>OdontoCix - Sistema de Gestión Dental</p>
    </div>
</body>
</html>
