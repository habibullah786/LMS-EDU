<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Curriculum extends Model
{
    protected $fillable = [
        'course_id',
        'name',
        'is_trial',
        'price',
        'max_students',
    ];

    protected $casts = [
        'is_trial' => 'boolean',
        'price' => 'decimal:2',
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function classes(): HasMany
    {
        return $this->hasMany(CourseClass::class, 'curriculum_id');
    }
}
