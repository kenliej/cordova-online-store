<?php

namespace Tests\Feature\Catalog;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductHighlight;
use App\Models\ProductImage;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogProductsTest extends TestCase
{
    use CatalogTestSupport, RefreshDatabase;

    private Category $electronics;

    private Category $audio;

    private Category $wearables;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();

        $this->electronics = $this->productCategory(['name' => 'Electronics', 'slug' => 'electronics']);
        $this->audio = $this->productCategory([
            'name' => 'Audio',
            'slug' => 'audio',
            'parent_id' => $this->electronics->id,
        ]);
        $this->wearables = $this->productCategory([
            'name' => 'Wearables',
            'slug' => 'wearables',
            'parent_id' => $this->electronics->id,
        ]);

        $category = $this->storeCategory(['name' => 'Department Store', 'slug' => 'department-store']);
        $this->store = Store::factory()->create([
            'name' => 'Department Store',
            'slug' => 'department-store',
            'category_id' => $category->id,
        ]);
    }

    private function product(array $attributes = []): Product
    {
        return Product::factory()->create(array_merge([
            'category_id' => $this->audio->id,
        ], $attributes));
    }

    public function test_product_list_is_public_and_paginated(): void
    {
        $this->product(['name' => 'Alpha', 'slug' => 'alpha']);
        $this->product(['name' => 'Bravo', 'slug' => 'bravo']);

        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'id', 'name', 'slug', 'sku', 'price', 'original_price', 'discount_percent',
                    'stock', 'in_stock', 'is_new', 'image', 'images', 'category', 'store',
                ]],
                'meta' => ['current_page', 'last_page', 'per_page', 'total', 'from', 'to'],
            ])
            ->assertJsonPath('meta.total', 2);
    }

    public function test_list_only_returns_active_products(): void
    {
        $this->product(['name' => 'Active Product', 'slug' => 'active-product']);
        $this->product(['name' => 'Hidden Product', 'slug' => 'hidden-product', 'is_active' => false]);

        $slugs = collect($this->getJson('/api/products')->assertOk()->json('data'))->pluck('slug');

        $this->assertTrue($slugs->contains('active-product'));
        $this->assertFalse($slugs->contains('hidden-product'));
    }

    public function test_soft_deleted_products_are_excluded(): void
    {
        $deleted = $this->product(['name' => 'Deleted Product', 'slug' => 'deleted-product']);
        $deleted->delete();

        $this->getJson('/api/products')->assertOk()->assertJsonPath('meta.total', 0);

        $this->getJson('/api/products/deleted-product')->assertNotFound();
    }

    public function test_pagination_and_per_page_cap(): void
    {
        foreach (range(1, 5) as $i) {
            $this->product(['name' => "Product {$i}", 'slug' => "product-{$i}"]);
        }

        $this->getJson('/api/products?page=2&per_page=2')
            ->assertOk()
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.last_page', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.total', 5)
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/products?per_page=100')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 50);
    }

    public function test_category_filter_includes_child_categories(): void
    {
        $this->product(['name' => 'Earbuds', 'slug' => 'earbuds']);
        $this->product(['name' => 'Watch', 'slug' => 'watch', 'category_id' => $this->wearables->id]);
        $this->product(['name' => 'Direct Electronics', 'slug' => 'direct-electronics', 'category_id' => $this->electronics->id]);
        $this->product(['name' => 'Other', 'slug' => 'other', 'category_id' => $this->storeCategory()->id]);

        $this->getJson('/api/products?category=electronics')
            ->assertOk()
            ->assertJsonPath('meta.total', 3);

        $this->getJson('/api/products?category=audio')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.slug', 'earbuds');

        // Category names are accepted as a convenience for the legacy filter UI.
        $this->getJson('/api/products?category=Electronics')
            ->assertOk()
            ->assertJsonPath('meta.total', 3);
    }

    public function test_unknown_category_returns_empty_list(): void
    {
        $this->product(['name' => 'Earbuds', 'slug' => 'earbuds']);

        $this->getJson('/api/products?category=does-not-exist')
            ->assertOk()
            ->assertJsonPath('meta.total', 0)
            ->assertJsonCount(0, 'data');
    }

    public function test_search_matches_name_and_description(): void
    {
        $this->product(['name' => 'Bluetooth Headphones', 'slug' => 'bt-headphones']);
        $this->product(['name' => 'Yoga Mat', 'slug' => 'yoga-mat', 'description' => 'Non-slip bluetooth-free exercise mat']);

        $this->getJson('/api/products?search=bluetooth')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $this->getJson('/api/products?search=Headphones')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.slug', 'bt-headphones');
    }

    public function test_sorting_by_price_and_newest(): void
    {
        $this->product(['name' => 'Cheap', 'slug' => 'cheap', 'price' => 100]);
        $this->product(['name' => 'Expensive', 'slug' => 'expensive', 'price' => 300]);
        $sale = $this->product(['name' => 'Sale', 'slug' => 'sale', 'price' => 200]);

        $asc = collect($this->getJson('/api/products?sort=price_asc')->json('data'))->pluck('price')->all();
        $this->assertSame([100, 200, 300], $asc);

        $desc = collect($this->getJson('/api/products?sort=price_desc')->json('data'))->pluck('price')->all();
        $this->assertSame([300, 200, 100], $desc);

        $newest = collect($this->getJson('/api/products?sort=newest')->json('data'))->pluck('slug')->first();
        $this->assertSame($sale->slug, $newest);
    }

    public function test_invalid_sort_is_rejected(): void
    {
        $this->getJson('/api/products?sort=cheapest')
            ->assertStatus(422)
            ->assertJsonValidationErrors('sort');
    }

    public function test_availability_filters(): void
    {
        $this->product(['name' => 'In Stock', 'slug' => 'in-stock', 'stock' => 5]);
        $this->product(['name' => 'Sold Out', 'slug' => 'sold-out', 'stock' => 0]);

        $this->getJson('/api/products?in_stock=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.slug', 'in-stock');

        $this->getJson('/api/products?out_of_stock=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.slug', 'sold-out');
    }

    public function test_product_detail_serializes_images_highlights_category_store_and_related(): void
    {
        $product = $this->product([
            'name' => 'Wireless Earbuds',
            'slug' => 'wireless-earbuds',
            'store_id' => $this->store->id,
            'price' => 1299,
            'original_price' => 1999,
            'stock' => 25,
            'is_new' => true,
        ]);

        ProductImage::query()->create([
            'product_id' => $product->id,
            'path' => 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
            'sort_order' => 0,
        ]);
        ProductImage::query()->create([
            'product_id' => $product->id,
            'path' => 'products/local-photo.jpg',
            'sort_order' => 1,
        ]);
        ProductHighlight::query()->create([
            'product_id' => $product->id,
            'title' => 'Premium Sound Quality',
            'body' => 'Enjoy rich, clear audio.',
            'sort_order' => 0,
        ]);

        foreach (range(1, 5) as $i) {
            $this->product(['name' => "Related {$i}", 'slug' => "related-{$i}"]);
        }
        $this->product(['name' => 'Inactive Related', 'slug' => 'inactive-related', 'is_active' => false]);

        $response = $this->getJson('/api/products/wireless-earbuds')->assertOk();

        $this->assertSame('Wireless Earbuds', $response->json('data.name'));
        $this->assertSame(1299.0, (float) $response->json('data.price'));
        $this->assertSame(35, $response->json('data.discount_percent'));
        $this->assertTrue($response->json('data.in_stock'));
        $this->assertSame(2, count($response->json('data.images')));
        $this->assertSame(
            'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
            $response->json('data.image'),
        );
        $this->assertStringContainsString('/storage/products/local-photo.jpg', $response->json('data.images.1'));
        $this->assertSame('Premium Sound Quality', $response->json('data.highlights.0.title'));
        $this->assertSame('Electronics - Audio', $response->json('data.category.display_name'));
        $this->assertSame('Department Store', $response->json('data.store.name'));
        $this->assertCount(4, $response->json('data.related'));

        $relatedSlugs = collect($response->json('data.related'))->pluck('slug');
        $this->assertFalse($relatedSlugs->contains('wireless-earbuds'));
        $this->assertFalse($relatedSlugs->contains('inactive-related'));
    }

    public function test_product_detail_without_store_returns_null_store(): void
    {
        $this->product(['name' => 'Loose Product', 'slug' => 'loose-product', 'store_id' => null]);

        $this->getJson('/api/products/loose-product')
            ->assertOk()
            ->assertJsonPath('data.store', null);
    }

    public function test_product_detail_is_404_for_inactive_or_missing_products(): void
    {
        $this->product(['name' => 'Hidden', 'slug' => 'hidden', 'is_active' => false]);

        $this->getJson('/api/products/hidden')->assertNotFound();
        $this->getJson('/api/products/nope')->assertNotFound();
    }
}
