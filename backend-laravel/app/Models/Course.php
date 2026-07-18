<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class Course extends Model
{
    protected $fillable = [
        'program_id',
        'department_id',
        'name',
        'description',
        'age_group',
        'level',
        'price',
        'is_trial',
        'max_capacity',
        'semester',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'is_trial' => 'boolean',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function classes(): HasMany
    {
        return $this->hasMany(CourseClass::class);
    }

    public function curricula(): HasMany
    {
        return $this->hasMany(Curriculum::class);
    }

    // Scopes for filtering
    public function scopeByProgram(Builder $query, $programId): Builder
    {
        return $query->where('program_id', $programId);
    }

    public function scopeByDepartment(Builder $query, $departmentId): Builder
    {
        return $query->where('department_id', $departmentId);
    }

    public function scopeByAgeGroup(Builder $query, $ageGroup): Builder
    {
        return $query->where('age_group', $ageGroup);
    }

    public function scopeByLevel(Builder $query, $level): Builder
    {
        return $query->where('level', $level);
    }

    public function scopeTrial(Builder $query): Builder
    {
        return $query->where('is_trial', true);
    }

    public function scopePaid(Builder $query): Builder
    {
        return $query->where('is_trial', false);
    }
}
