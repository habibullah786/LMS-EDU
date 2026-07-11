<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchoolClass extends Model
{
    protected $table = 'school_classes';

    protected $fillable = [
        'curriculum', 'locations', 'age_groups', 'course', 'department',
        'type', 'semester', 'price', 'date', 'time',
        'available_slots', 'instructor', 'max_students',
        'hide_when_full', 'modules',
    ];

    protected $casts = [
        'locations'       => 'array',
        'age_groups'      => 'array',
        'price'           => 'float',
        'hide_when_full'  => 'boolean',
        'modules'         => 'array',
    ];

    public function isFull(): bool
    {
        return $this->available_slots <= 0;
    }
}
