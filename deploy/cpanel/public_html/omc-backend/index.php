<?php

/**
 * Front controller shim — deploy the Laravel API under
 * https://YOUR-DOMAIN/omc-backend on cPanel / shared hosting.
 *
 * Upload this file together with the sibling `.htaccess` into:
 *
 *     public_html/omc-backend/index.php
 *
 * The Laravel application itself must live OUTSIDE the web root, e.g.:
 *
 *     /home/CPANEL_USER/omc-backend/          <- Laravel project
 *     /home/CPANEL_USER/public_html/omc-backend/   <- this shim
 *
 * By default the app is expected at ../../omc-backend/public/index.php
 * relative to this file (i.e. /home/CPANEL_USER/omc-backend/public/index.php).
 * If your layout differs, set the OMC_APP_PUBLIC_INDEX environment variable in
 * .htaccess (SetEnv OMC_APP_PUBLIC_INDEX /absolute/path/public/index.php) or
 * edit the fallback below.
 */

$appPublicIndex = getenv('OMC_APP_PUBLIC_INDEX');

if ($appPublicIndex === false || $appPublicIndex === '') {
    $appPublicIndex = dirname(__DIR__, 2).'/omc-backend/public/index.php';
}

if (! is_file($appPublicIndex)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Online Mall API: Laravel front controller not found.\n";
    echo "Expected: {$appPublicIndex}\n";
    echo "Edit public_html/omc-backend/index.php (or set OMC_APP_PUBLIC_INDEX in .htaccess).\n";

    return;
}

require $appPublicIndex;
