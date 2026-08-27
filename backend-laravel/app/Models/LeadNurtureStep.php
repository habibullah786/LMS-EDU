<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadNurtureStep extends Model
{
    protected $fillable = ['lead_id', 'step', 'scheduled_at', 'sent_at', 'status', 'error'];
    protected $casts = ['scheduled_at' => 'datetime', 'sent_at' => 'datetime'];
    public function lead(): BelongsTo { return $this->belongsTo(Lead::class); }
}

