<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Casts\AsCollection;

class Waitlist extends Model
{
    protected $fillable = [
        'student_id',
        'class_id',
        'user_id',
        'position',
        'status',
        'approved_at',
        'rejection_reason',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function class(): BelongsTo
    {
        return $this->belongsTo(CourseClass::class, 'class_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approve(): bool
    {
        $this->update([
            'status' => 'approved',
            'approved_at' => now(),
        ]);
        return true;
    }

    public function reject($reason = null): bool
    {
        $this->update([
            'status' => 'rejected',
            'rejection_reason' => $reason,
        ]);
        return true;
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isWaiting(): bool
    {
        return $this->status === 'waiting';
    }
}
