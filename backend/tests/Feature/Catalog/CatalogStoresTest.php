<?php

namespace Tests\Feature\Catalog;

use App\Models\Product;
use App\Models\Store;
use App\Models\StoreHighlight;
use App\Models\StoreImage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogStoresTest extends TestCase
{
    use CatalogStoreTestSupport, CatalogTestSupport, RefreshDatabase;

    public function test_store_list_is_public_and_paginated(): void
    {
        $this->store(['name' => 'McDonalds', 'slug' => 'mcdonalds']);
        $this->store(['name' => 'Jollibee', 'slug' => 'jollibee']);

        $this->getJson('/api/stores')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'id', 'name', 'slug', 'category_id', 'category', 'operating_hours',
                    'availability_label', 'phone', 'is_open', 'floor_location', 'image_url',
                ]],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ])
            ->assertJsonPath('meta.total', 2);
    }

    public function test_store_list_filters_by_category_and_search(): void
    {
        $foods = $this->storeCategory(['name' => 'Foods & Beverages', 'slug' => 'foods-beverages']);
        $fashion = $this->storeCategory(['name' => 'Fashion & Apparel', 'slug' => 'fashion-apparel']);

        Store::factory()->create(['name' => 'Jollibee', 'slug' => 'jollibee', 'category_id' => $foods->id]);
        Store::factory()->create(['name' => 'Shein', 'slug' => 'shein', 'category_id' => $fashion->id]);

        $this->getJson('/api/stores?category=foods-beverages')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Jollibee');

        $this->getJson('/api/stores?search=shein')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Shein');

        // Category names are accepted as well as slugs.
        $this->getJson('/api/stores?category='.urlencode('Fashion & Apparel'))
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Shein');
    }

    public function test_store_list_filters_open_and_closed(): void
    {
        $this->store(['name' => 'Open Store', 'slug' => 'open-store', 'is_open' => true]);
        $this->store(['name' => 'Closed Store', 'slug' => 'closed-store', 'is_open' => false]);

        $this->getJson('/api/stores?open=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.slug', 'open-store');

        $this->getJson('/api/stores?closed=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.slug', 'closed-store');
    }

    public function test_soft_deleted_stores_are_excluded(): void
    {
        $store = $this->store(['name' => 'Gone Store', 'slug' => 'gone-store']);
        $store->delete();

        $this->getJson('/api/stores')->assertOk()->assertJsonPath('meta.total', 0);
        $this->getJson('/api/stores/gone-store')->assertNotFound();
    }

    public function test_store_detail_serializes_images_highlights_and_active_products(): void
    {
        $category = $this->storeCategory(['name' => 'Foods & Beverages', 'slug' => 'foods-beverages']);
        $store = Store::factory()->create([
            'name' => 'McDonalds',
            'slug' => 'mcdonalds',
            'category_id' => $category->id,
            'description' => 'Welcome to McDonalds Cordova branch!',
            'image_path' => 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600',
            'operating_hours' => '6:00AM - 11:00PM',
        ]);

        StoreImage::query()->create([
            'store_id' => $store->id,
            'path' => 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
            'sort_order' => 0,
        ]);
        StoreImage::query()->create([
            'store_id' => $store->id,
            'path' => 'stores/gallery-local.jpg',
            'sort_order' => 1,
        ]);
        StoreHighlight::query()->create([
            'store_id' => $store->id,
            'title' => 'Dine-In & Takeout',
            'body' => 'Spacious seating area.',
            'sort_order' => 0,
        ]);

        foreach (range(1, 14) as $i) {
            Product::factory()->forStore($store)->create(['name' => "Store Product {$i}", 'slug' => "store-product-{$i}"]);
        }

        Product::factory()->forStore($store)->create([
            'name' => 'Inactive Product',
            'slug' => 'inactive-product',
            'is_active' => false,
        ]);
        Product::factory()->create(['name' => 'No Store Product', 'slug' => 'no-store-product']);
        Product::factory()->create(['name' => 'Other Store Product', 'slug' => 'other-store-product']);

        $response = $this->getJson('/api/stores/mcdonalds')->assertOk();

        $this->assertSame('McDonalds', $response->json('data.name'));
        $this->assertSame('Foods & Beverages', $response->json('data.category.name'));
        $this->assertSame('https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600', $response->json('data.image_url'));
        $this->assertCount(2, $response->json('data.images'));
        $this->assertStringContainsString('/storage/stores/gallery-local.jpg', $response->json('data.images.1'));
        $this->assertSame('Dine-In & Takeout', $response->json('data.highlights.0.title'));

        $products = collect($response->json('data.products'));
        $this->assertCount(12, $products);
        $this->assertSame($store->id, $products->first()['store']['id']);
        $this->assertFalse($products->pluck('slug')->contains('inactive-product'));
        $this->assertFalse($products->pluck('slug')->contains('no-store-product'));
        $this->assertFalse($products->pluck('slug')->contains('other-store-product'));
    }

    public function test_store_detail_404_for_unknown_store(): void
    {
        $this->getJson('/api/stores/does-not-exist')->assertNotFound();
    }
}
