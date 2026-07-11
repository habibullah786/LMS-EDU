<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Lead;

class Enrollment extends Model
{
    protected $fillable = [
        'user_id',
        'parent_name',
        'parent_email',
        'parent_phone',
        'total_amount',
        'status',
        'booking_date',
        'registration_type',
        'is_paid',
        'enrollment_date',
        'group_reference_id',
        'trial_ref_id',
        'source',
        'lead_id',
    ];

    protected $casts = [
        'booking_date' => 'datetime',
        'enrollment_date' => 'datetime',
        'total_amount' => 'decimal:2',
        'is_paid' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function students(): HasMany
    {
        return $this->hasMany(EnrollmentStudent::class);
    }

    public function trialStudents(): HasMany
    {
        return $this->hasMany(TrialEnrollmentStudent::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function courseClass(): BelongsTo
    {
        return $this->belongsTo(CourseClass::class, 'class_id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function scopeByStatus($query, $status)
    {
        if ($status && $status !== 'All') {
            return $query->where('status', $status);
        }
        return $query;
    }

    public function scopeByLocation($query, $location)
    {
        if ($location && $location !== 'All') {
            return $query->whereHas('students', function ($q) {
                $q->where('location', $location);
            });
        }
        return $query;
    }

    public function scopeByCourse($query, $course)
    {
        if ($course && $course !== 'All') {
            return $query->whereHas('students', function ($q) {
                $q->where('course', $course);
            });
        }
        return $query;
    }
}
