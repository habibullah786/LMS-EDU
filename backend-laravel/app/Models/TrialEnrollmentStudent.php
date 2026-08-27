<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrialEnrollmentStudent extends Model
{
    protected $table = 'trial_enrollment_students';

    protected $fillable = [
        'enrollment_id',
        'orbund_unique_id',
        'first_name',
        'last_name',
        'date_of_birth',
        'orbund_class_id',
        'class_date',
        'class_time',
        'location',
        'course',
        'price',
        'attended',
        'school_class_id', 'attendance_marked_at', 'attendance_marked_by',
        'missed_reason_code', 'missed_reason_notes', 'enroll_decision',
        'enroll_decision_at', 'enroll_decision_by', 'not_enrolled_reason_code',
        'not_enrolled_notes', 'reminder_invalidated_at',
    ];

    protected $casts = [
        'attended' => 'boolean',
        'class_date' => 'date',
        'date_of_birth' => 'date',
        'attendance_marked_at' => 'datetime',
        'enroll_decision_at' => 'datetime',
        'reminder_invalidated_at' => 'datetime',
    ];

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }
}
