<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Serves public-disk uploads (product/store photos, avatars) through Laravel.
 *
 * In the Docker/nginx deployment nginx serves /storage/* directly from the
 * shared volume; on shared hosting (cPanel) where the document root is a
 * subdirectory shim, no public/storage symlink exists, so this route keeps
 * image URLs working at APP_URL/storage/{path}.
 */
class MediaController extends Controller
{
    /** Extensions that are safe to serve inline from the public disk. */
    private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'ico'];

    public function __invoke(Request $request, string $path): Response
    {
        $path = ltrim(rawurldecode($path), '/');

        if ($path === '' || str_contains($path, "\0") || str_contains($path, '..')) {
            abort(404);
        }

        $extension = strtolower((string) pathinfo($path, PATHINFO_EXTENSION));
        if (! in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            abort(404);
        }

        $disk = Storage::disk('public');

        // Neon Object Storage objects are already public; avoid trying to read
        // a local path from the S3 filesystem.
        if (config('filesystems.disks.public.driver') === 's3') {
            return redirect()->away($disk->url($path));
        }

        if (! $disk->exists($path)) {
            abort(404);
        }

        $root = realpath($disk->path(''));
        $absolute = realpath($disk->path($path));

        // Defence in depth: never escape the public-disk root via symlinks.
        if ($root === false || $absolute === false || ! str_starts_with($absolute, $root.DIRECTORY_SEPARATOR)) {
            abort(404);
        }

        $mime = $disk->mimeType($path) ?: 'application/octet-stream';

        $response = new BinaryFileResponse($absolute);
        $response->headers->set('Content-Type', $mime);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Content-Disposition', 'inline');
        $response->headers->set('Cache-Control', 'public, max-age=604800');
        $response->setMaxAge(604800);
        $response->setPublic();

        return $response;
    }
}
