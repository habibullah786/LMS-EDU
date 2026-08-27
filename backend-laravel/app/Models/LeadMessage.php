<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadMessage extends Model
{
    protected $fillable = ['lead_id', 'direction', 'channel', 'from_address', 'to_address', 'body', 'provider_message_id', 'received_at'];
    protected $casts = ['received_at' => 'datetime'];
    public function lead(): BelongsTo { return $this->belongsTo(Lead::class); }
}

