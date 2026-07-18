<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadReminderEmail extends Model
{
    public $timestamps = false;
    protected $fillable = ['lead_id', 'reminder_day', 'sent_at'];
    protected $casts = ['reminder_day' => 'integer', 'sent_at' => 'datetime'];
    public function lead(): BelongsTo { return $this->belongsTo(Lead::class); }
}
