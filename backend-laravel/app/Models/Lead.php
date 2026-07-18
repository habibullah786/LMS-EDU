<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lead extends Model
{
    protected $appends = ['next_reminder_email_at'];

    protected $fillable = [
        'user_id', 'name', 'email', 'phone', 'age_group', 'course', 'location',
        'orbund_program_id', 'orbund_campus_type', 'level_id', 'semester_id',
        'source', 'page_url', 'orbund_session_id', 'is_registered', 'registered_at',
        'reminder_email_count', 'reminder_email_time', 'reminder_call_count', 'reminder_call_time', 'scheduled_call_time',
    ];

    protected $casts = [
        'is_registered' => 'boolean',
        'registered_at' => 'datetime',
        'reminder_email_count' => 'integer',
        'reminder_email_time' => 'datetime',
        'reminder_call_count' => 'integer',
        'reminder_call_time' => 'datetime',
        'scheduled_call_time' => 'datetime',
    ];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function reminderCalls(): HasMany { return $this->hasMany(LeadReminderCall::class)->orderBy('called_at'); }
    public function reminderEmails(): HasMany { return $this->hasMany(LeadReminderEmail::class)->orderBy('sent_at'); }

    public function getNextReminderEmailAtAttribute(): ?string
    {
        if ($this->is_registered || $this->reminder_email_count >= 3 || !$this->created_at) {
            return null;
        }

        $days = [1, 3, 7];
        return $this->created_at->copy()->addDays($days[$this->reminder_email_count])->toIso8601String();
    }
}
