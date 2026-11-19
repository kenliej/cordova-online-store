<?php

/**
 * DEV-ONLY router that simulates the cPanel subdirectory deployment locally:
 *
 *   php -S 127.0.0.1:8081 -t backend/public scripts/cpanel-subdir-sim.php
 *
 * Requests must arrive under /omc-backend/... exactly like
 * https://kjugarap.top/omc-backend/api/health. SCRIPT_NAME is rewritten so
 * Laravel (Symfony Request) strips the /omc-backend base path and matches the
 * same routes/config as production. For a faithful test also start the server
 * with APP_URL=http://127.0.0.1:8081/omc-backend.
 */

$prefix = '/omc-backend';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if ($uri !== $prefix && ! str_starts_with($uri, $prefix.'/')) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode([
        'message' => 'Not found. This dev router only serves URLs under '.$prefix.'/ .',
        'hint' => 'Open http://127.0.0.1:8081'.$prefix.'/api/health',
    ]);

    return true;
}

$publicIndex = dirname(__DIR__).'/backend/public/index.php';

$_SERVER['SCRIPT_NAME'] = $prefix.'/index.php';
$_SERVER['SCRIPT_FILENAME'] = $publicIndex;
$_SERVER['PHP_SELF'] = $prefix.'/index.php';

require $publicIndex;

return true;
