<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnrollmentStudent extends Model
{
    protected $fillable = [
        'enrollment_id',
        'student_id',
        'class_id',
        'class_name',
        'course',
        'location',
        'instructor',
        'price',
        'type',
    ];

    protected $casts = [
        'price' => 'decimal:2',
    ];

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
