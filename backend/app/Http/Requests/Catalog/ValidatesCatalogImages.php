<?php

namespace App\Http\Requests\Catalog;

use Closure;
use Illuminate\Http\UploadedFile;

/**
 * Shared validation for product image arrays. Accepts either uploaded image
 * files (multipart `images[]`) or URL / storage-path strings (JSON payloads).
 */
trait ValidatesCatalogImages
{
    /**
     * @return list<Closure>
     */
    protected function catalogImageRules(int $maxKilobytes = 3072): array
    {
        return [
            function (string $attribute, mixed $value, Closure $fail) use ($maxKilobytes): void {
                $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
                $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

                if ($value instanceof UploadedFile) {
                    $extension = strtolower($value->getClientOriginalExtension());
                    $mime = (string) $value->getMimeType();

                    if (! in_array($extension, $allowedExtensions, true) || ! in_array($mime, $allowedMimeTypes, true)) {
                        $fail('Each image must be a JPG, JPEG, PNG or WEBP file.');

                        return;
                    }

                    if ($maxKilobytes > 0 && $value->getSize() > $maxKilobytes * 1024) {
                        $fail("Each image may not be larger than {$maxKilobytes} KB.");
                    }

                    return;
                }

                if (! is_string($value) || trim($value) === '') {
                    $fail('Each image must be an uploaded image file or a URL/path string.');

                    return;
                }

                if (mb_strlen($value) > 255) {
                    $fail('Each image URL/path may not be longer than 255 characters.');
                }
            },
        ];
    }
}
