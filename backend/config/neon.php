<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Neon Object Storage (S3-compatible)
    |--------------------------------------------------------------------------
    | Neon injects AWS-standard S3 credentials/endpoint/region. The bucket is
    | declared in neon.ts (default: "assets"). Credentials are branch-scoped.
    */
    'object_storage' => [
        'bucket' => env('NEON_OBJECT_STORAGE_BUCKET', 'assets'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Neon AI Gateway
    |--------------------------------------------------------------------------
    | NEON_AI_GATEWAY_BASE_URL is a bare host (no path). The OpenAI-compatible
    | model catalog lives at {base}/v1/models and chat at {base}/v1/chat/completions.
    */
    'ai_gateway' => [
        'base_url' => env('NEON_AI_GATEWAY_BASE_URL'),
        'token' => env('NEON_AI_GATEWAY_TOKEN'),
        'model' => env('NEON_AI_GATEWAY_MODEL', 'gpt-5-mini'),
        'timeout' => (int) env('NEON_AI_GATEWAY_TIMEOUT', 20),
    ],

    /*
    |--------------------------------------------------------------------------
    | Neon Realtime
    |--------------------------------------------------------------------------
    | The browser-safe URL is exposed to the SPA separately; the secret must
    | stay server-side and is used to seal live queries.
    */
    'realtime' => [
        'url' => env('NEON_REALTIME_URL'),
        'secret' => env('NEON_REALTIME_SECRET'),
    ],
];
