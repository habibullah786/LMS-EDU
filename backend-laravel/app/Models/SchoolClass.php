<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchoolClass extends Model
{
    protected $table = 'school_classes';

    protected $fillable = [
        'curriculum', 'locations', 'age_groups', 'course',
        'type', 'semester', 'price', 'date', 'time',
        'available_slots', 'instructor', 'max_students',
    ];

    protected $casts = [
        'locations'  => 'array',
        'age_groups' => 'array',
        'price'      => 'float',
    ];
}
