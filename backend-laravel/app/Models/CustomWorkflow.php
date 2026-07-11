<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomWorkflow extends Model
{
    protected $fillable = [
        'name', 'description', 'trigger_type', 'event_key',
        'condition_location', 'condition_course',
        'scheduled_at', 'scheduled_sent_at',
        'email_enabled', 'email_recipient', 'email_subject', 'email_body',
        'sms_enabled', 'sms_recipient', 'sms_body', 'active',
    ];

    protected $casts = [
        'email_enabled'      => 'boolean',
        'sms_enabled'        => 'boolean',
        'active'             => 'boolean',
        'scheduled_at'       => 'datetime',
        'scheduled_sent_at'  => 'datetime',
    ];
}
