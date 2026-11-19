<?php

namespace Tests\Feature\Worker;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Catalog\CatalogTestSupport;
use Tests\TestCase;

class WorkerProductsTest extends TestCase
{
    use CatalogTestSupport, RefreshDatabase;

    private Category $audio;

    private Category $wearables;

    protected function setUp(): void
    {
        parent::setUp();

        $electronics = $this->productCategory(['name' => 'Electronics', 'slug' => 'electronics']);
        $this->audio = $this->productCategory([
            'name' => 'Audio',
            'slug' => 'audio',
            'parent_id' => $electronics->id,
        ]);
        $this->wearables = $this->productCategory([
            'name' => 'Wearables',
            'slug' => 'wearables',
            'parent_id' => $electronics->id,
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'New Gadget',
            'category_id' => $this->audio->id,
            'description' => 'A shiny new gadget.',
            'price' => 999.5,
            'stock' => 10,
        ], $overrides);
    }

    public function test_guests_cannot_access_worker_products(): void
    {
        $this->getJson('/api/worker/products')->assertUnauthorized();
        $this->postJson('/api/worker/products', [])->assertUnauthorized();
    }

    public function test_customers_cannot_access_worker_products(): void
    {
        $this->actingAsCustomer();

        $this->getJson('/api/worker/products')->assertForbidden();
        $this->postJson('/api/worker/products', $this->payload())->assertForbidden();
    }

    public function test_worker_can_list_products_with_filters_and_sorting(): void
    {
        Product::factory()->create([
            'name' => 'Wireless Earbuds',
            'slug' => 'wireless-earbuds',
            'category_id' => $this->audio->id,
            'price' => 1299,
            'stock' => 25,
        ]);
        Product::factory()->outOfStock()->create([
            'name' => 'Smart Watch',
            'slug' => 'smart-watch',
            'category_id' => $this->wearables->id,
            'price' => 2499,
        ]);

        $this->actingAsWorker();

        $this->getJson('/api/worker/products')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'id', 'name', 'slug', 'description', 'category_id', 'store_id',
                    'price', 'stock', 'in_stock', 'is_new', 'is_active', 'images', 'category',
                ]],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ])
            ->assertJsonPath('meta.total', 2);

        $this->getJson('/api/worker/products?category=electronics')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $this->getJson('/api/worker/products?category=audio')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.slug', 'wireless-earbuds');

        $this->getJson('/api/worker/products?in_stock=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->getJson('/api/worker/products?search=smart')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->getJson('/api/worker/products?sort=price_desc')
            ->assertOk()
            ->assertJsonPath('data.0.slug', 'smart-watch');

        $this->getJson('/api/worker/products?per_page=1&page=2')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.current_page', 2);
    }

    public function test_admin_can_also_manage_products(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/worker/products')->assertOk();
        $this->postJson('/api/worker/products', $this->payload())->assertCreated();
    }

    public function test_worker_can_create_a_product_with_image_urls(): void
    {
        $worker = $this->actingAsWorker();

        $response = $this->postJson('/api/worker/products', $this->payload([
            'is_new' => true,
            'images' => ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600'],
        ]));

        $response->assertCreated()
            ->assertJsonPath('data.name', 'New Gadget')
            ->assertJsonPath('data.slug', 'new-gadget')
            ->assertJsonPath('data.is_new', true)
            ->assertJsonPath('data.in_stock', true);

        $this->assertSame(1, count($response->json('data.images')));
        $this->assertSame($worker->id, $response->json('data.created_by'));

        $this->assertDatabaseHas('products', [
            'slug' => 'new-gadget',
            'category_id' => $this->audio->id,
            'stock' => 10,
        ]);
    }

    public function test_worker_can_create_a_product_with_uploaded_images(): void
    {
        Storage::fake('public');
        $this->actingAsWorker();

        $response = $this->post('/api/worker/products', $this->payload([
            'images' => [$this->fakeJpeg('one.jpg'), $this->fakePng('two.png')],
        ]));

        $response->assertCreated();

        $product = Product::query()->where('slug', 'new-gadget')->firstOrFail();
        $this->assertSame(2, $product->images()->count());

        foreach ($product->images as $image) {
            Storage::disk('public')->assertExists($image->path);
        }

        foreach ($response->json('data.images') as $url) {
            $this->assertStringContainsString('/storage/products/', $url);
        }
    }

    public function test_legacy_payload_fields_are_normalised(): void
    {
        $this->actingAsWorker();

        $this->postJson('/api/worker/products', [
            'name' => 'Legacy Product',
            'category' => 'audio',
            'price' => 49,
            'stocks' => 7,
        ])->assertCreated()->assertJsonPath('data.stock', 7);
    }

    public function test_create_product_validation_errors(): void
    {
        $this->actingAsWorker();

        $this->postJson('/api/worker/products', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'category_id', 'price', 'stock']);

        $storeCategory = $this->storeCategory();

        $this->postJson('/api/worker/products', $this->payload(['category_id' => $storeCategory->id]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('category_id');

        $this->postJson('/api/worker/products', $this->payload(['price' => -1]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('price');

        $this->postJson('/api/worker/products', $this->payload(['stock' => -5]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('stock');

        $this->postJson('/api/worker/products', $this->payload(['store_id' => 999999]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('store_id');

        $this->postJson('/api/worker/products', $this->payload([
            'images' => array_fill(0, 4, 'https://example.com/a.jpg'),
        ]))->assertStatus(422)->assertJsonValidationErrors('images');
    }

    public function test_uploaded_image_validation_rejects_bad_mime_and_oversized_files(): void
    {
        Storage::fake('public');
        $this->actingAsWorker();

        $this->post('/api/worker/products', $this->payload([
            'images' => [$this->fakeNonImage('fake.jpg')],
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('images.0');

        $this->post('/api/worker/products', $this->payload([
            'images' => [$this->fakeOversizedJpeg('big.jpg')],
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('images.0');

        $this->assertSame(0, Product::query()->count());
    }

    public function test_product_slugs_are_unique(): void
    {
        $this->actingAsWorker();

        $first = $this->postJson('/api/worker/products', $this->payload())->assertCreated();
        $second = $this->postJson('/api/worker/products', $this->payload())->assertCreated();

        $this->assertSame('new-gadget', $first->json('data.slug'));
        $this->assertSame('new-gadget-2', $second->json('data.slug'));
    }

    public function test_worker_can_update_a_product(): void
    {
        $product = Product::factory()->create([
            'name' => 'Old Gadget',
            'slug' => 'old-gadget',
            'category_id' => $this->audio->id,
            'price' => 100,
            'stock' => 5,
        ]);

        $this->actingAsWorker();

        $this->patchJson('/api/worker/products/'.$product->id, [
            'name' => 'Updated Gadget',
            'price' => 1500,
            'stock' => 3,
            'is_new' => true,
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Updated Gadget')
            ->assertJsonPath('data.slug', 'updated-gadget')
            ->assertJsonPath('data.price', 1500)
            ->assertJsonPath('data.stock', 3)
            ->assertJsonPath('data.is_new', true)
            ->assertJsonPath('data.is_active', false);
    }

    public function test_worker_can_update_multipart_with_removed_and_added_images(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('products/remove-me.jpg', 'bytes');

        $product = Product::factory()->create([
            'name' => 'Gallery Gadget',
            'slug' => 'gallery-gadget',
            'category_id' => $this->audio->id,
        ]);
        $removable = ProductImage::query()->create([
            'product_id' => $product->id,
            'path' => 'products/remove-me.jpg',
            'sort_order' => 0,
        ]);
        ProductImage::query()->create([
            'product_id' => $product->id,
            'path' => 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
            'sort_order' => 1,
        ]);

        $this->actingAsWorker();

        $this->post('/api/worker/products/'.$product->id, [
            '_method' => 'PATCH',
            'name' => 'Gallery Gadget',
            'remove_image_ids' => [$removable->id],
            'images' => [$this->fakeJpeg('added.jpg')],
        ])
            ->assertOk()
            ->assertJsonCount(2, 'data.images');

        $this->assertDatabaseMissing('product_images', ['id' => $removable->id]);
        Storage::disk('public')->assertMissing('products/remove-me.jpg');
        $this->assertSame(2, $product->images()->count());
        $this->assertTrue($product->images()->where('path', 'like', 'products/%')->exists());
    }

    public function test_product_cannot_have_more_than_three_images(): void
    {
        $product = Product::factory()->create([
            'name' => 'Full Gallery',
            'slug' => 'full-gallery',
            'category_id' => $this->audio->id,
        ]);

        foreach (range(1, 3) as $i) {
            ProductImage::query()->create([
                'product_id' => $product->id,
                'path' => "https://images.unsplash.com/photo-{$i}?w=600",
                'sort_order' => $i,
            ]);
        }

        $this->actingAsWorker();

        $this->patchJson('/api/worker/products/'.$product->id, [
            'is_new' => true,
            'images' => ['https://images.unsplash.com/photo-4?w=600'],
        ])->assertStatus(422)->assertJsonValidationErrors('images');

        $this->assertSame(3, $product->images()->count());
    }

    public function test_remove_image_ids_must_belong_to_the_product(): void
    {
        $product = Product::factory()->create(['category_id' => $this->audio->id]);
        $other = Product::factory()->create(['category_id' => $this->audio->id]);
        $foreignImage = ProductImage::query()->create([
            'product_id' => $other->id,
            'path' => 'products/foreign.jpg',
            'sort_order' => 0,
        ]);

        $this->actingAsWorker();

        $this->patchJson('/api/worker/products/'.$product->id, [
            'remove_image_ids' => [$foreignImage->id],
        ])->assertStatus(422)->assertJsonValidationErrors('remove_image_ids.0');
    }

    public function test_worker_can_soft_delete_a_product(): void
    {
        $product = Product::factory()->create([
            'name' => 'Deleted Gadget',
            'slug' => 'deleted-gadget',
            'category_id' => $this->audio->id,
        ]);

        $this->actingAsWorker();

        $this->deleteJson('/api/worker/products/'.$product->id)->assertOk();

        $this->assertSoftDeleted('products', ['id' => $product->id]);
        $this->getJson('/api/worker/products')->assertOk()->assertJsonPath('meta.total', 0);
        $this->getJson('/api/products')->assertOk()->assertJsonPath('meta.total', 0);
    }

    public function test_update_and_delete_return_404_for_missing_products(): void
    {
        $this->actingAsWorker();

        $this->patchJson('/api/worker/products/999999', ['name' => 'Nope'])->assertNotFound();
        $this->deleteJson('/api/worker/products/999999')->assertNotFound();
    }
}
