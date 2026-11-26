<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Image-path conventions shared by the commerce serializers.
 *
 * `product_images.path` / `order_items.image_path` store either a local disk
 * relative path (uploads) or a full external URL (demo seeds). Full URLs are
 * returned untouched; local paths are exposed as `/storage/<path>` so the SPA
 * can load them through the dev proxy / nginx without leaking disk details.
 */
class CommerceImageService
{
    public static function url(?string $path): ?string
    {
        if ($path === null || trim($path) === '') {
            return null;
        }

        $path = trim($path);

        if (preg_match('#^(https?:)?//#i', $path) === 1 || str_starts_with($path, 'data:')) {
            return $path;
        }

        // Neo/Neon object storage returns an absolute public URL; local disks
        // keep the relative path so the dev proxy / nginx can serve it.
        if (config('filesystems.disks.public.driver') === 's3') {
            return Storage::disk('public')->url($path);
        }

        return '/storage/'.ltrim($path, '/');
    }

    /**
     * Primary image path for each product (one query for the whole collection,
     * ordering follows product_images.sort_order then id).
     *
     * @param  array<int, int|string|null>  $productIds
     * @return array<int, string> product_id => raw image path
     */
    public static function primaryImagePaths(array $productIds): array
    {
        $productIds = array_values(array_unique(array_filter(
            array_map(static fn ($id) => $id === null ? null : (int) $id, $productIds),
            static fn (?int $id) => $id !== null && $id > 0,
        )));

        if ($productIds === []) {
            return [];
        }

        try {
            return DB::table('product_images')
                ->whereIn('product_id', $productIds)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(['product_id', 'path'])
                ->groupBy('product_id')
                ->map(static fn ($rows) => (string) $rows->first()->path)
                ->all();
        } catch (\Throwable) {
            // Catalog table not migrated yet (parallel module) — degrade gracefully.
            return [];
        }
    }

    public static function primaryImagePath(?int $productId): ?string
    {
        if ($productId === null) {
            return null;
        }

        return self::primaryImagePaths([$productId])[$productId] ?? null;
    }
}
