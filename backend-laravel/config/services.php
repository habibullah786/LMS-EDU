<?php

return [

    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),
    'survey_url' => env('SURVEY_URL', env('FRONTEND_URL', 'http://localhost:3000').'/trial'),

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
        'webhook_url' => env('TWILIO_WEBHOOK_URL', ''),
    ],

    'razorpay' => [
        'key_id' => env('RAZORPAY_KEY_ID', ''),
        'key_secret' => env('RAZORPAY_KEY_SECRET', ''),
        'webhook_secret' => env('RAZORPAY_WEBHOOK_SECRET', ''),
    ],

    'orbund' => [
        'sync_url' => env('ORBUND_SYNC_URL', ''),
        'api_token' => env('ORBUND_API_TOKEN', ''),
    ],

];
