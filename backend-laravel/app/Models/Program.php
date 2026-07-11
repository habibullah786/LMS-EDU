<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Program extends Model
{
    protected $fillable = [
        'name',
        'description',
        'department',
    ];

    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }
}
