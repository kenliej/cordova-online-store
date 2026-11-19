<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Public media route used when the app is deployed in a subdirectory on shared
 * hosting (no public/storage symlink served by the web server).
 */
class MediaRouteTest extends TestCase
{
    use RefreshDatabase;

    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Storage::disk('public')->put('products/sample.png', base64_decode(self::PNG));
    }

    public function test_public_image_is_served_with_safe_headers(): void
    {
        $response = $this->get('/storage/products/sample.png');

        $response->assertOk();
        $this->assertSame('image/png', $response->headers->get('Content-Type'));
        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        $this->assertStringContainsString('inline', (string) $response->headers->get('Content-Disposition'));
    }

    public function test_dot_segments_are_blocked(): void
    {
        $this->get('/storage/..%2F.env')->assertNotFound();
        $this->get('/storage/products/..%2F..%2F.env')->assertNotFound();
    }

    public function test_non_image_extensions_are_blocked(): void
    {
        Storage::disk('public')->put('products/shell.php', 'not executed');

        $this->get('/storage/products/shell.php')->assertNotFound();
    }

    public function test_missing_file_returns_404(): void
    {
        $this->get('/storage/products/missing.png')->assertNotFound();
    }
}
