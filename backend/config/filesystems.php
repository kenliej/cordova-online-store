<?php

$mediaDisk = env('MEDIA_DISK', 'local');
$publicBucket = env('NEON_PUBLIC_BUCKET', 'media');
$privateBucket = env('NEON_PRIVATE_BUCKET', 'uploads');
$endpoint = rtrim((string) env('AWS_ENDPOINT_URL_S3'), '/');

/*
 * Neon Object Storage is S3-compatible and requires path-style addressing.
 * The public bucket serves objects at {endpoint}/{bucket}/{path} with
 * anonymous reads; the private bucket is only reachable through Laravel.
 */
$neonDisk = static function (string $bucket, ?string $url = null): array {
    $config = [
        'driver' => 's3',
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_REGION', 'us-east-2'),
        'bucket' => $bucket,
        'endpoint' => env('AWS_ENDPOINT_URL_S3'),
        'use_path_style_endpoint' => true,
        // Neon S3 does not implement object ACLs; bucket policy controls read access.
        'throw' => true,
    ];

    if ($url !== null && $url !== '') {
        $config['url'] = $url;
    }

    return $config;
};

$neonPublicUrl = $endpoint !== '' ? $endpoint.'/'.$publicBucket : null;

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
        |
        | Local/Docker keeps the existing `storage/app/public` disk and relative
        | `/storage/...` URLs. Render uses Neon Object Storage's public_read
        | bucket so uploads survive container restarts; the DB stores the object
        | key and resources return the full public URL.
        */
        'public' => $mediaDisk === 'neon'
            ? $neonDisk($publicBucket, $neonPublicUrl)
            : [
                'driver' => 'local',
                'root' => storage_path('app/public'),
                'url' => env('APP_URL').'/storage',
                'visibility' => 'public',
                'throw' => false,
                'report' => false,
            ],

        /*
        | Sensitive uploads (government ID scans). Never publicly accessible;
        | streamed only through an authorized controller. On Render these live in
        | a private Neon bucket instead of the ephemeral container filesystem.
        */
        'private' => $mediaDisk === 'neon'
            ? $neonDisk($privateBucket)
            : [
                'driver' => 'local',
                'root' => storage_path('app/private'),
                'visibility' => 'private',
                'throw' => false,
                'report' => false,
            ],

        /*
        | Neon Object Storage probe disk (legacy diagnostics + seed mirroring).
        | Credentials/endpoint/region are injected by Neon as AWS_* variables.
        */
        'neon' => $neonDisk(env('NEON_OBJECT_STORAGE_BUCKET', 'assets')),

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
