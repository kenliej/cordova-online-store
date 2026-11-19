<?php

namespace App\Http\Resources\Catalog;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * Base serializer for catalog entities.
 *
 * Image path contract: a `path` column may hold either
 *  - an absolute http(s) URL (seeded demo data), returned untouched, or
 *  - a storage-relative path (uploads), returned as an absolute public URL.
 */
abstract class CatalogResource extends JsonResource
{
    protected static function mediaUrl(?string $path): ?string
    {
        if ($path === null) {
            return null;
        }

        $path = trim($path);

        if ($path === '') {
            return null;
        }

        if (preg_match('#^https?://#i', $path) === 1) {
            return $path;
        }

        return Storage::disk('public')->url($path);
    }

    /**
     * @param  iterable<int, string|null>  $paths
     * @return list<string>
     */
    protected static function mediaUrls(iterable $paths): array
    {
        $urls = [];

        foreach ($paths as $path) {
            $url = static::mediaUrl(is_string($path) ? $path : null);

            if ($url !== null) {
                $urls[] = $url;
            }
        }

        return $urls;
    }
}
