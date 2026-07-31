<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Comprobante extends BaseModel
{
    use Auditable, HasFactory;

    public const TIPO_FACTURA = '01';

    public const TIPO_BOLETA = '03';

    public const ESTADO_PENDIENTE = 'pendiente';

    public const ESTADO_ENVIADO = 'enviado';

    public const ESTADO_ACEPTADO = 'aceptado';

    public const ESTADO_ACEPTADO_OBSERVACIONES = 'aceptado_con_observaciones';

    public const ESTADO_RECHAZADO = 'rechazado';

    public const ESTADO_ERROR = 'error';

    protected $fillable = [
        'tenant_id', 'tipo_doc', 'serie', 'correlativo',
        'budget_id', 'payment_id', 'patient_id',
        'doc_type', 'doc_number', 'name', 'address',
        'mto_oper_gravadas', 'mto_igv', 'total_impuestos', 'valor_venta', 'subtotal', 'mto_imp_venta',
        'estado', 'error_code', 'error_message', 'cdr_code', 'cdr_description', 'cdr_notes', 'hash',
        'xml_path', 'cdr_zip_path', 'pdf_path',
        'emitted_at', 'cdr_at',
    ];

    protected function casts(): array
    {
        return [
            'correlativo' => 'integer',
            'mto_oper_gravadas' => 'decimal:2',
            'mto_igv' => 'decimal:2',
            'total_impuestos' => 'decimal:2',
            'valor_venta' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'mto_imp_venta' => 'decimal:2',
            'cdr_notes' => 'array',
            'emitted_at' => 'datetime',
            'cdr_at' => 'datetime',
        ];
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function budget()
    {
        return $this->belongsTo(Budget::class);
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function getNumeroAttribute(): string
    {
        return $this->serie.'-'.$this->correlativo;
    }

    public function getEstadoLabelAttribute(): string
    {
        return match ($this->estado) {
            self::ESTADO_PENDIENTE => 'Pendiente',
            self::ESTADO_ENVIADO => 'Enviado',
            self::ESTADO_ACEPTADO => 'Aceptado',
            self::ESTADO_ACEPTADO_OBSERVACIONES => 'Aceptado con observaciones',
            self::ESTADO_RECHAZADO => 'Rechazado',
            self::ESTADO_ERROR => 'Error',
            default => $this->estado,
        };
    }

    public function getTipoDocLabelAttribute(): string
    {
        return $this->tipo_doc === self::TIPO_FACTURA ? 'Factura' : 'Boleta';
    }
}
