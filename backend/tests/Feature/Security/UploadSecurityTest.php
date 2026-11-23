<?php

namespace Tests\Feature\Security;

use App\Models\Category;
use App\Models\IdDocument;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * A04/A08 — Insecure file upload handling.
 *
 * Uploads must reject non-raster-image content (SVG/script polyglots/mime
 * mismatches), be renamed randomly, never be executable, and government IDs
 * must live on the private disk with no direct web path.
 */
class UploadSecurityTest extends TestCase
{
    use RefreshDatabase, SecurityTestSupport;

    // Laravel 11+/12 uses a 40 character random (alphanumeric) hash name.
    private const RANDOM_NAME = '[A-Za-z0-9]{40}';

    private function productCategory(): Category
    {
        return Category::factory()->product()->create();
    }

    /** @return array<string, mixed> */
    private function productPayload(Category $category, array $overrides = []): array
    {
        return array_merge([
            'name' => 'Upload Probe '.uniqid(),
            'category_id' => $category->getKey(),
            'price' => 25.5,
            'stock' => 10,
        ], $overrides);
    }

    /** Multipart request that still asks for JSON responses (files cannot be sent as JSON). */
    private function multipart(string $uri, array $data)
    {
        return $this->withHeaders([
            'Accept' => 'application/json',
            'X-Requested-With' => 'XMLHttpRequest',
        ])->post($uri, $data);
    }

    /** Create a product with uploaded files and return the persisted product. */
    private function createProductWithImages(Category $category, array $files, int $expectedStatus): Product
    {
        $response = $this->multipart('/api/worker/products', $this->productPayload($category, [
            'images' => $files,
        ]));

        $response->assertStatus($expectedStatus);

        return Product::query()->latest('id')->firstOrFail();
    }

    /**
     * Simulate the browser-declared/real content MIME type. Laravel's test
     * File::getMimeType() otherwise derives the MIME from the fake filename,
     * which would hide content-vs-extension mismatches.
     */
    private function fileWithMime(string $name, string $content, string $mime): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, $content)->mimeType($mime);
    }

    public function test_svg_uploads_are_rejected_everywhere(): void
    {
        Storage::fake('public');
        Storage::fake('private');

        $svgContent = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>';
        $svgFile = $this->fileWithMime('evil.svg', $svgContent, 'image/svg+xml');
        $renamedSvg = $this->fileWithMime('evil.png', $svgContent, 'image/svg+xml');

        $category = $this->productCategory();
        $this->asWorker();

        $this->multipart('/api/worker/products', $this->productPayload($category, ['images' => [$svgFile]]))
            ->assertStatus(422)->assertJsonValidationErrors('images.0');

        $this->multipart('/api/worker/products', $this->productPayload($category, ['images' => [$renamedSvg]]))
            ->assertStatus(422)->assertJsonValidationErrors('images.0');

        $this->asCustomer();
        $this->multipart('/api/profile/avatar', ['avatar' => $renamedSvg])
            ->assertStatus(422)->assertJsonValidationErrors('avatar');

        // Registration ID upload must also reject SVG masquerading as PNG.
        $this->multipart('/api/auth/register', array_merge($this->registerPayload([
            'email' => 'svg.'.uniqid().'@gaisano-cordova.com',
        ]), [
            'id_front' => $renamedSvg,
            'id_back' => $this->fakePng('back.png'),
        ]))->assertStatus(422)->assertJsonValidationErrors('id_front');

        $this->assertSame(0, Product::query()->count());
    }

    public function test_script_polyglot_uploads_are_renamed_and_not_script_executable(): void
    {
        Storage::fake('public');
        $category = $this->productCategory();
        $this->asWorker();

        $product = $this->createProductWithImages($category, [
            $this->polyglotPng('shell.php.png'),
            $this->polyglotJpeg('shell.phtml.jpg'),
        ], 201);

        $product->load('images');
        $this->assertCount(2, $product->images);

        foreach ($product->images as $image) {
            $this->assertMatchesRegularExpression(
                '#^products/'.self::RANDOM_NAME.'\.(png|jpg|jpeg|webp)$#',
                $image->path,
                'Uploaded filename must be a random hash with a raster-image extension.',
            );
            $this->assertStringNotContainsString('shell', $image->path);
            $this->assertDoesNotMatchRegularExpression('#\.(php|phtml|phar|php[0-9])#i', $image->path);
            $this->assertTrue(Storage::disk('public')->exists($image->path));
        }
    }

    public function test_mime_mismatch_and_script_content_are_rejected(): void
    {
        Storage::fake('public');
        $category = $this->productCategory();
        $this->asWorker();

        // Plain HTML masquerading as PNG: image rule / mime allow-list rejects it.
        $html = $this->fileWithMime('fake.png', '<html><script>alert(1)</script></html>', 'text/html');
        $this->multipart('/api/worker/products', $this->productPayload($category, ['images' => [$html]]))
            ->assertStatus(422)->assertJsonValidationErrors('images.0');

        // Script content masquerading as an image -> reject.
        $script = $this->fileWithMime(
            'payload.png',
            $this->phpOpenTag().' '.$this->phpProbeCode().' ?'.'>',
            'text/plain',
        );
        $this->multipart('/api/worker/products', $this->productPayload($category, ['images' => [$script]]))
            ->assertStatus(422)->assertJsonValidationErrors('images.0');

        // PDF content renamed to an image is rejected too.
        $pdf = $this->fileWithMime('id.png', '%PDF-1.4 fake pdf bytes', 'application/pdf');
        $this->multipart('/api/worker/products', $this->productPayload($category, ['images' => [$pdf]]))
            ->assertStatus(422)->assertJsonValidationErrors('images.0');

        $this->assertSame(0, Product::query()->count());
    }

    public function test_double_extension_is_neutralised_by_random_renaming(): void
    {
        Storage::fake('public');
        $category = $this->productCategory();
        $this->asWorker();

        $product = $this->createProductWithImages($category, [
            $this->fakePng('evil.phtml.png'),
            $this->fakePng('double.extension.php.png'),
        ], 201);

        $paths = $product->images()->pluck('path')->all();
        $this->assertCount(2, $paths);

        foreach ($paths as $path) {
            $this->assertMatchesRegularExpression('#^products/'.self::RANDOM_NAME.'\.png$#', $path);
            $this->assertStringNotContainsString('evil', $path);
            $this->assertStringNotContainsString('double', $path);
        }
    }

    public function test_oversized_uploads_are_rejected(): void
    {
        Storage::fake('public');
        $category = $this->productCategory();
        $this->asWorker();

        $bigImage = UploadedFile::fake()->createWithContent(
            'big.png',
            $this->tinyPngBytes().str_repeat('A', 4 * 1024 * 1024),
        );

        $this->multipart('/api/worker/products', $this->productPayload($category, ['images' => [$bigImage]]))
            ->assertStatus(422)->assertJsonValidationErrors('images.0');

        $this->asCustomer();
        $bigAvatar = UploadedFile::fake()->createWithContent(
            'big-avatar.png',
            $this->tinyPngBytes().str_repeat('A', 3 * 1024 * 1024),
        );
        $this->multipart('/api/profile/avatar', ['avatar' => $bigAvatar])
            ->assertStatus(422)->assertJsonValidationErrors('avatar');

        $this->assertSame(0, Product::query()->count());
    }

    public function test_id_documents_are_private_renamed_and_have_no_public_url(): void
    {
        Storage::fake('private');
        Storage::fake('public');

        $this->multipart('/api/auth/register', array_merge(
            $this->registerPayload(['email' => 'private.ids.'.uniqid().'@gaisano-cordova.com']),
            $this->idDocuments(),
        ))->assertCreated();

        $user = User::query()->latest('id')->firstOrFail();
        $documents = IdDocument::query()->where('user_id', $user->getKey())->get();

        $this->assertCount(2, $documents);
        $this->assertCount(2, Storage::disk('private')->allFiles());
        $this->assertCount(0, Storage::disk('public')->allFiles(), 'ID documents must never touch the public disk.');

        foreach ($documents as $document) {
            $this->assertMatchesRegularExpression(
                '#^id-documents/'.$user->getKey().'/'.self::RANDOM_NAME.'\.(png|jpg|jpeg|webp)$#',
                $document->path,
                'ID document filename must be randomised.',
            );
            $this->assertTrue(Storage::disk('private')->exists($document->path));

            // No unsigned direct web access to the private disk path.
            $direct = $this->get('/storage/'.$document->path);
            $this->assertContains($direct->getStatusCode(), [403, 404], 'Private uploads must not be served without authorization.');
        }

        // The owner profile only exposes metadata, never the storage path.
        $this->actingAs($user);
        $profile = $this->getJson('/api/profile')->assertOk();
        $this->assertStringNotContainsString('storage/app', (string) $profile->getContent());
        $this->assertStringNotContainsString('id-documents/', (string) $profile->getContent());
        $this->assertSame(['id_front' => true, 'id_back' => true], $profile->json('data.id_documents'));
    }

    public function test_avatar_upload_is_randomised_on_the_public_disk(): void
    {
        Storage::fake('public');
        $customer = User::factory()->customer()->create();

        $this->actingAs($customer);
        $this->multipart('/api/profile/avatar', [
            'avatar' => $this->fakePng('../../etc/'.'passwd.png'),
        ])->assertOk();

        $path = $customer->fresh()->profile_photo_path;
        $this->assertMatchesRegularExpression(
            '#^profile-photos/'.$customer->getKey().'/'.self::RANDOM_NAME.'\.png$#',
            $path,
        );
        $this->assertTrue(Storage::disk('public')->exists($path));
        $this->assertStringNotContainsString('passwd', $path);
    }

    public function test_json_image_url_passthrough_never_serializes_a_script_scheme(): void
    {
        Storage::fake('public');
        $category = $this->productCategory();
        $this->asWorker();

        $this->postJson('/api/worker/products', $this->productPayload($category, [
            'images' => [
                'javascript:alert(1)',
                '/etc/'.'passwd',
                'php'.'://filter/resource=index.php',
            ],
        ]))->assertCreated();

        $product = Product::query()->latest('id')->firstOrFail();

        // The serializer must only ever produce http(s) / storage URLs: a
        // stored javascript:/data: string can never become an executable link.
        $public = $this->getJson('/api/products/'.$product->slug)->assertOk();
        $images = $public->json('data.images');
        $this->assertIsArray($images);

        foreach ($images as $url) {
            $url = (string) $url;
            $this->assertMatchesRegularExpression(
                '#^(https?://|/)#',
                $url,
                'Serialized image URLs must be http(s) or same-origin paths: script/data schemes are neutralised.',
            );
            $this->assertStringStartsNotWith('javascript:', $url, 'A javascript: URL must never be serialized.');
            $this->assertStringStartsNotWith('data:', $url, 'A data: URL must never be serialized.');
        }
    }

    public function test_product_image_count_is_capped_at_three(): void
    {
        Storage::fake('public');
        $category = $this->productCategory();
        $this->asWorker();

        $this->multipart('/api/worker/products', $this->productPayload($category, [
            'images' => [
                $this->fakePng('a.png'),
                $this->fakePng('b.png'),
                $this->fakePng('c.png'),
                $this->fakePng('d.png'),
            ],
        ]))->assertStatus(422)->assertJsonValidationErrors('images');
    }
}
