<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lead extends Model
{
    protected $fillable = [
        'name',
        'email',
        'phone',
        'age_group',
        'orbund_program_id',
        'location',
        'orbund_campus_type',
        'level_id',
        'semester_id',
        'source',
        'page_url',
        'orbund_session_id',
        'status',
        'notes',
    ];

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }
}
