<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Department extends Model
{
    protected $fillable = [
        'name',
        'location',
        'orbund_campus_type',
        'description',
    ];

    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }
}
