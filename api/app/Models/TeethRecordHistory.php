<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeethRecordHistory extends BaseModel
{
    protected $fillable = [
        'tenant_id', 'patient_id', 'fdi_code',
        'old_status', 'new_status',
        'old_surface', 'new_surface',
        'old_notes', 'new_notes',
        'changed_by',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
