<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadActivity extends Model
{
    protected $fillable = [
        'lead_id', 'actor_id', 'type', 'from_status', 'to_status',
        'outcome_code', 'notes', 'metadata', 'occurred_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'occurred_at' => 'datetime',
    ];

    public function lead(): BelongsTo { return $this->belongsTo(Lead::class); }
    public function actor(): BelongsTo { return $this->belongsTo(User::class, 'actor_id'); }
}

