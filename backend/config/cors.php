<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Two supported deployment shapes:
    |
    | 1. Same-origin (Docker/nginx): SPA and API are served from one host, so
    |    CORS is only needed for local Vite dev.
    | 2. Split deployment (frontend on Vercel, API under kjugarap.top/omc-backend):
    |    set CORS_ALLOWED_ORIGINS to the exact frontend origin(s), e.g.
    |    https://omc.vercel.app, and use Bearer-token auth in the SPA.
    |
    | Never use "*" here: the API supports credentialed cookie sessions as well.
    | For Vercel preview deployments you can add a regex (comma separated) via
    | CORS_ALLOWED_ORIGIN_PATTERNS, e.g. ^https://.*\.vercel\.app$ — only do
    | this for token-auth deployments.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'storage/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173'))
    ))),

    'allowed_origins_patterns' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_ORIGIN_PATTERNS', ''))
    ))),

    'allowed_headers' => ['*'],

    // Let the SPA read rate-limit hints on 429 responses across origins.
    'exposed_headers' => [
        'Retry-After',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
    ],

    'max_age' => (int) env('CORS_MAX_AGE', 3600),

    'supports_credentials' => (bool) env('CORS_SUPPORTS_CREDENTIALS', true),

];
