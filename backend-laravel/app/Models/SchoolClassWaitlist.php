<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SchoolClassWaitlist extends Model
{
    protected $fillable = [
        'school_class_id',
        'parent_name',
        'parent_email',
        'parent_phone',
        'student_name',
        'date_of_birth',
        'position',
        'status',
        'approved_at',
        'rejection_reason',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'approved_at'   => 'datetime',
    ];

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'school_class_id');
    }
}
