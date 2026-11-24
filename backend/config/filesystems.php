<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            // Framework-served signed URLs are not used; disabling this prevents
            // Laravel's built-in `storage/{path}` routes from shadowing the
            // public media route used by the cPanel subdirectory deployment.
            'serve' => false,
            'throw' => false,
            'report' => false,
        ],

        /*
        | Publicly served assets (product photos, store photos, avatars).
        | The frontend receives relative "/storage/..." URLs.
        */
        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        /*
        | Sensitive uploads (government ID scans). Never publicly accessible;
        | streamed only through an authorized controller.
        */
        'private' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'visibility' => 'private',
            'throw' => false,
            'report' => false,
        ],

        /*
        | Neon Object Storage (S3-compatible, branch-scoped).
        | Credentials/endpoint/region are injected by Neon as AWS_* variables;
        | path-style addressing is required by the Neon endpoint.
        */
        'neon' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_REGION', 'us-east-2'),
            'bucket' => env('NEON_OBJECT_STORAGE_BUCKET', 'assets'),
            'endpoint' => env('AWS_ENDPOINT_URL_S3'),
            'use_path_style_endpoint' => true,
            'throw' => true,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
