<?php

namespace Tests\Feature\Catalog;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\UploadedFile;

/**
 * Shared fixtures for the catalog / store / worker-product feature tests.
 *
 * Real (tiny) JPEG/PNG byte sequences are used instead of
 * UploadedFile::fake()->image() because this PHP build has no GD extension and
 * Laravel's `image`/`mimes` rules inspect the file contents.
 */
trait CatalogTestSupport
{
    /** 1x1 white JPEG. */
    private static string $jpegBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==';

    /** 1x1 transparent PNG. */
    private static string $pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    protected function productCategory(array $attributes = []): Category
    {
        return Category::factory()->product()->create($attributes);
    }

    protected function storeCategory(array $attributes = []): Category
    {
        return Category::factory()->storeCategory()->create($attributes);
    }

    protected function fakeJpeg(string $name = 'photo.jpg'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, base64_decode(self::$jpegBase64));
    }

    protected function fakePng(string $name = 'photo.png'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, base64_decode(self::$pngBase64));
    }

    /**
     * A `.jpg`-named file whose actual content is plain text. A genuine
     * UploadedFile (not the fake testing File) is used so content-based
     * `image`/`mimes` rules see the real mime type instead of the extension.
     */
    protected function fakeNonImage(string $name = 'photo.jpg'): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'catalog-upload-');
        file_put_contents($path, 'this is definitely not an image');

        return new UploadedFile($path, $name, 'image/jpeg', null, true);
    }

    /**
     * Real JPEG content padded past 5 MB so the `max` rule fails.
     */
    protected function fakeOversizedJpeg(string $name = 'photo.jpg'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode(self::$jpegBase64).str_repeat('0', 6 * 1024 * 1024),
        );
    }

    protected function actingAsRole(string $role, array $attributes = []): User
    {
        $user = User::factory()->create(array_merge([
            'role' => $role,
            'status' => UserStatus::Active->value,
        ], $attributes));

        $this->actingAs($user, 'sanctum');

        return $user;
    }

    protected function actingAsAdmin(array $attributes = []): User
    {
        return $this->actingAsRole(UserRole::Admin->value, $attributes);
    }

    protected function actingAsWorker(array $attributes = []): User
    {
        return $this->actingAsRole(UserRole::Worker->value, $attributes);
    }

    protected function actingAsCustomer(array $attributes = []): User
    {
        return $this->actingAsRole(UserRole::Customer->value, $attributes);
    }
}
