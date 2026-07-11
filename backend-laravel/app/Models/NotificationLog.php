<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationLog extends Model
{
    public $timestamps = false;

    protected $fillable = ['type', 'event', 'recipient', 'subject', 'status', 'error_message'];

    protected $casts = ['created_at' => 'datetime'];
}
