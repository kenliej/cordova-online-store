<?php

namespace Tests\Feature\Admin;

use App\Models\Store;
use App\Models\StoreHighlight;
use App\Models\StoreImage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Catalog\CatalogStoreTestSupport;
use Tests\Feature\Catalog\CatalogTestSupport;
use Tests\TestCase;

class StoresTest extends TestCase
{
    use CatalogStoreTestSupport, CatalogTestSupport, RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'New Store',
            'category_id' => $this->storeCategory()->id,
            'operating_hours' => '6:00AM - 11:00PM',
            'phone' => '09171234567',
            'is_open' => 1,
            'description' => 'A brand new mall store.',
            'floor_location' => 'Ground Floor, Unit G-99',
        ], $overrides);
    }

    public function test_guests_cannot_access_admin_stores(): void
    {
        $this->getJson('/api/admin/stores')->assertUnauthorized();
        $this->postJson('/api/admin/stores', [])->assertUnauthorized();
    }

    public function test_customers_cannot_access_admin_stores(): void
    {
        $this->actingAsCustomer();

        $this->getJson('/api/admin/stores')->assertForbidden();
    }

    public function test_workers_cannot_access_admin_stores(): void
    {
        $this->actingAsWorker();

        $this->getJson('/api/admin/stores')->assertForbidden();
    }

    public function test_admin_can_list_stores_with_search_filter_and_pagination(): void
    {
        $foods = $this->storeCategory(['name' => 'Foods', 'slug' => 'foods-beverages']);
        $fashion = $this->storeCategory(['name' => 'Fashion', 'slug' => 'fashion-apparel']);

        Store::factory()->create(['name' => 'Jollibee', 'slug' => 'jollibee', 'category_id' => $foods->id]);
        Store::factory()->closed()->create(['name' => 'Mang Inasal', 'slug' => 'mang-inasal', 'category_id' => $foods->id]);
        Store::factory()->create(['name' => 'Shein', 'slug' => 'shein', 'category_id' => $fashion->id]);

        $this->actingAsAdmin();

        $this->getJson('/api/admin/stores')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'name', 'slug', 'category', 'operating_hours', 'is_open', 'image_url']],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ])
            ->assertJsonPath('meta.total', 3);

        $this->getJson('/api/admin/stores?search=shein')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Shein');

        $this->getJson('/api/admin/stores?category=foods-beverages')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $this->getJson('/api/admin/stores?is_open=0')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.slug', 'mang-inasal');

        $this->getJson('/api/admin/stores?per_page=2&page=2')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.current_page', 2);
    }

    public function test_admin_can_show_a_store_with_gallery_and_highlights(): void
    {
        $store = Store::factory()->create(['name' => 'McDonalds', 'slug' => 'mcdonalds']);

        StoreImage::query()->create(['store_id' => $store->id, 'path' => 'stores/a.jpg', 'sort_order' => 0]);
        StoreHighlight::query()->create([
            'store_id' => $store->id,
            'title' => 'Dine-In',
            'body' => 'Spacious seating area.',
            'sort_order' => 0,
        ]);

        $this->actingAsAdmin();

        $response = $this->getJson('/api/admin/stores/'.$store->id)->assertOk();

        $this->assertCount(1, $response->json('data.images'));
        $this->assertSame('Dine-In', $response->json('data.highlights.0.title'));
        $this->assertSame([], $response->json('data.products'));
    }

    public function test_admin_can_create_a_store_with_an_image(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();

        $response = $this->post('/api/admin/stores', array_merge($this->payload(), [
            'image' => $this->fakeJpeg('store.jpg'),
        ]));

        $response->assertCreated()
            ->assertJsonPath('data.name', 'New Store')
            ->assertJsonPath('data.slug', 'new-store')
            ->assertJsonPath('data.is_open', true);

        $store = Store::query()->where('slug', 'new-store')->firstOrFail();

        $this->assertNotNull($store->image_path);
        $this->assertStringStartsWith('stores/', $store->image_path);
        Storage::disk('public')->assertExists($store->image_path);
        $this->assertStringContainsString('/storage/stores/', $response->json('data.image_url'));
    }

    public function test_admin_can_create_a_store_without_an_image(): void
    {
        $this->actingAsAdmin();

        $this->post('/api/admin/stores', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.image_url', null);
    }

    public function test_create_store_validation_errors(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/admin/stores', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'category_id', 'phone']);

        $productCategory = $this->productCategory();

        $this->postJson('/api/admin/stores', $this->payload([
            'category_id' => $productCategory->id,
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('category_id');

        $this->post('/api/admin/stores', array_merge($this->payload(), [
            'image' => $this->fakeNonImage(),
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('image');

        $this->post('/api/admin/stores', array_merge($this->payload(), [
            'image' => $this->fakeOversizedJpeg(),
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('image');
    }

    public function test_store_slugs_are_unique(): void
    {
        $this->actingAsAdmin();
        $category = $this->storeCategory();

        $first = $this->post('/api/admin/stores', $this->payload([
            'name' => 'Same Store',
            'category_id' => $category->id,
        ]))->assertCreated();

        $second = $this->post('/api/admin/stores', $this->payload([
            'name' => 'Same Store',
            'category_id' => $category->id,
        ]))->assertCreated();

        $this->assertSame('same-store', $first->json('data.slug'));
        $this->assertSame('same-store-2', $second->json('data.slug'));
    }

    public function test_admin_can_update_a_store_and_replace_its_image(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('stores/old.jpg', 'old-image-bytes');

        $store = Store::factory()->create([
            'name' => 'Old Name',
            'slug' => 'old-name',
            'image_path' => 'stores/old.jpg',
        ]);

        $this->actingAsAdmin();

        $response = $this->post('/api/admin/stores/'.$store->id, [
            '_method' => 'PATCH',
            'name' => 'Renamed Store',
            'phone' => '09998887777',
            'description' => 'Updated description.',
            'is_open' => 0,
            'image' => $this->fakePng('new-store.png'),
        ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Renamed Store')
            ->assertJsonPath('data.slug', 'renamed-store')
            ->assertJsonPath('data.phone', '09998887777')
            ->assertJsonPath('data.is_open', false);

        $store->refresh();

        $this->assertNotSame('stores/old.jpg', $store->image_path);
        Storage::disk('public')->assertMissing('stores/old.jpg');
        Storage::disk('public')->assertExists($store->image_path);
    }

    public function test_update_store_validation_errors(): void
    {
        $store = Store::factory()->create();
        $this->actingAsAdmin();

        $this->patchJson('/api/admin/stores/'.$store->id, ['name' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');

        $this->post('/api/admin/stores/'.$store->id, [
            '_method' => 'PATCH',
            'image' => $this->fakeNonImage(),
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('image');
    }

    public function test_admin_can_soft_delete_a_store(): void
    {
        $store = Store::factory()->create(['name' => 'Doomed Store', 'slug' => 'doomed-store']);

        $this->actingAsAdmin();

        $this->deleteJson('/api/admin/stores/'.$store->id)->assertOk();

        $this->assertSoftDeleted('stores', ['id' => $store->id]);
        $this->getJson('/api/admin/stores')->assertOk()->assertJsonPath('meta.total', 0);
        $this->getJson('/api/stores')->assertOk()->assertJsonPath('meta.total', 0);
        $this->getJson('/api/stores/doomed-store')->assertNotFound();
    }

    public function test_admin_store_show_returns_404_for_missing_store(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/admin/stores/999999')->assertNotFound();
    }
}
