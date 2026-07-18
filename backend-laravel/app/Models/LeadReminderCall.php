<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadReminderCall extends Model
{
    public $timestamps = false;
    protected $fillable = ['lead_id', 'called_by', 'called_at'];
    protected $casts = ['called_at' => 'datetime'];

    public function lead(): BelongsTo { return $this->belongsTo(Lead::class); }
    public function operator(): BelongsTo { return $this->belongsTo(User::class, 'called_by'); }
}
