<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseClass extends Model
{
    protected $table = 'classes';

    protected $fillable = [
        'course_id',
        'curriculum_id',
        'start_datetime',
        'end_datetime',
        'total_seats',
        'available_seats',
        'instructor',
        'location',
        'description',
        'status',
    ];

    protected $casts = [
        'start_datetime' => 'datetime',
        'end_datetime' => 'datetime',
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function curriculum(): BelongsTo
    {
        return $this->belongsTo(Curriculum::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'class_id');
    }

    public function waitlists(): HasMany
    {
        return $this->hasMany(Waitlist::class, 'class_id');
    }

    public function hasAvailableSeats(): bool
    {
        return $this->available_seats > 0;
    }

    public function decrementSeats(int $count = 1): bool
    {
        if ($this->available_seats >= $count) {
            $this->decrement('available_seats', $count);
            return true;
        }
        return false;
    }

    public function incrementSeats(int $count = 1): void
    {
        $this->increment('available_seats', $count);
    }
}
