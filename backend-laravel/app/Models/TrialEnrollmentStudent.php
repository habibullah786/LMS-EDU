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
    ];

    protected $casts = [
        'attended' => 'boolean',
    ];

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }
}
