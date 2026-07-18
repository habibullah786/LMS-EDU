<?php

$configuredOrigins = array_map('trim', explode(',', env(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://localhost:3001'
)));

$allowedOrigins = array_values(array_unique(array_filter([
    ...$configuredOrigins,
    env('FRONTEND_URL'),
    'https://lms-edu-kappa.vercel.app',
])));

return [
    'paths'                    => ['api/*'],
    'allowed_methods'          => ['*'],
    'allowed_origins'          => $allowedOrigins,
    'allowed_origins_patterns' => [],
    'allowed_headers'          => ['*'],
    'exposed_headers'          => [],
    'max_age'                  => 0,
    'supports_credentials'     => false,
];
