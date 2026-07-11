<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Certificate extends Model
{
    protected $fillable = [
        'trial_enrollment_student_id',
        'certificate_number',
        'student_name',
        'course',
        'location',
        'issued_at',
    ];

    protected $casts = [
        'issued_at' => 'date',
    ];

    public function trialEnrollmentStudent(): BelongsTo
    {
        return $this->belongsTo(TrialEnrollmentStudent::class);
    }
}
