<?php

return [

    'sendgrid' => [
        'api_key'     => env('SENDGRID_API_KEY', ''),
        'from_email'  => env('SENDGRID_FROM_EMAIL', 'noreply@exceedrobotics.com'),
        'from_name'   => env('SENDGRID_FROM_NAME', 'Exceed Robotics'),
        'admin_email' => env('SENDGRID_ADMIN_EMAIL', 'admin@exceedrobotics.com'),
    ],

    'twilio' => [
        'sid'   => env('TWILIO_ACCOUNT_SID', ''),
        'token' => env('TWILIO_AUTH_TOKEN', ''),
        'from'  => env('TWILIO_FROM_NUMBER', ''),
    ],

];
