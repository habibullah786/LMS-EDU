<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StaffInvitation extends Model
{
    protected $fillable = ['name', 'email', 'access_level', 'permissions', 'token_hash', 'invited_by', 'expires_at', 'accepted_at'];
    protected $hidden = ['token_hash'];
    protected $casts = ['permissions' => 'array', 'expires_at' => 'datetime', 'accepted_at' => 'datetime'];
}
