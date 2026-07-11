<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrialAgeGroup extends Model
{
    protected $fillable = [
        'name',
        'course',
        'orbund_program_id',
        'orbund_level_id',
        'sort_order',
    ];
}
