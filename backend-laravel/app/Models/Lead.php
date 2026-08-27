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
        'status', 'postal_code', 'preferred_call_at', 'children_count', 'course_interest_count',
        'marketing_email_consent', 'marketing_sms_consent', 'marketing_consent_at',
        'is_spam', 'spam_reason', 'duplicate_of_lead_id', 'data_confirmed_at',
        'data_confirmed_by', 'follow_up_at', 'follow_up_required',
    ];

    protected $casts = [
        'is_registered' => 'boolean',
        'registered_at' => 'datetime',
        'reminder_email_count' => 'integer',
        'reminder_email_time' => 'datetime',
        'reminder_call_count' => 'integer',
        'reminder_call_time' => 'datetime',
        'scheduled_call_time' => 'datetime',
        'preferred_call_at' => 'datetime',
        'marketing_email_consent' => 'boolean',
        'marketing_sms_consent' => 'boolean',
        'marketing_consent_at' => 'datetime',
        'is_spam' => 'boolean',
        'data_confirmed_at' => 'datetime',
        'follow_up_at' => 'datetime',
        'follow_up_required' => 'boolean',
    ];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function reminderCalls(): HasMany { return $this->hasMany(LeadReminderCall::class)->orderBy('called_at'); }
    public function reminderEmails(): HasMany { return $this->hasMany(LeadReminderEmail::class)->orderBy('sent_at'); }
    public function activities(): HasMany { return $this->hasMany(LeadActivity::class)->latest('occurred_at'); }
    public function nurtureSteps(): HasMany { return $this->hasMany(LeadNurtureStep::class)->orderBy('step'); }
    public function messages(): HasMany { return $this->hasMany(LeadMessage::class)->latest(); }
    public function enrollments(): HasMany { return $this->hasMany(Enrollment::class)->latest(); }
    public function duplicateOf(): BelongsTo { return $this->belongsTo(self::class, 'duplicate_of_lead_id'); }
    public function dataConfirmedBy(): BelongsTo { return $this->belongsTo(User::class, 'data_confirmed_by'); }

    public function getNextReminderEmailAtAttribute(): ?string
    {
        if ($this->is_registered || $this->is_spam || $this->duplicate_of_lead_id || $this->reminder_email_count >= 3 || !$this->created_at) {
            return null;
        }

        $days = [1, 3, 7];
        return $this->created_at->copy()->addDays($days[$this->reminder_email_count])->toIso8601String();
    }
}
