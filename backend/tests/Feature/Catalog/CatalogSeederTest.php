<?php

namespace Tests\Feature\Catalog;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductHighlight;
use App\Models\ProductImage;
use App\Models\Store;
use App\Models\StoreHighlight;
use App\Models\StoreImage;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_seeder_produces_the_demo_catalog(): void
    {
        $this->seed(CatalogSeeder::class);

        $this->assertSame(16, Category::query()->where('type', Category::TYPE_PRODUCT)->count());
        $this->assertSame(11, Category::query()->where('type', Category::TYPE_STORE)->count());
        $this->assertSame(10, Store::query()->count());
        $this->assertSame(12, Product::query()->count());
        $this->assertSame(14, ProductImage::query()->count());
        $this->assertSame(19, StoreImage::query()->count());
        $this->assertSame(12, ProductHighlight::query()->count());
        $this->assertSame(10, StoreHighlight::query()->count());

        $earbuds = Product::query()->where('slug', 'wireless-earbuds')->firstOrFail();
        $this->assertSame('Wireless Earbuds', $earbuds->name);
        $this->assertSame(1299.0, (float) $earbuds->price);
        $this->assertSame(1999.0, (float) $earbuds->original_price);
        $this->assertSame(25, $earbuds->stock);
        $this->assertTrue($earbuds->is_new);
        $this->assertSame('Electronics - Audio', $earbuds->category->displayName());
        $this->assertSame('department-store', $earbuds->store->slug);
        $this->assertSame(3, $earbuds->images()->count());
        $this->assertSame(4, $earbuds->highlights()->count());

        $this->assertSame(4, Product::query()->where('stock', 0)->count());
        $this->assertTrue(Store::query()->where('slug', 'mang-inasal')->firstOrFail()->is_open === false);
        $this->assertSame(12, Product::query()->whereNotNull('store_id')->count());
    }

    public function test_catalog_seeder_is_idempotent(): void
    {
        $this->seed(CatalogSeeder::class);

        $counts = [
            Category::query()->count(),
            Store::query()->count(),
            Product::query()->count(),
            ProductImage::query()->count(),
            StoreImage::query()->count(),
            ProductHighlight::query()->count(),
            StoreHighlight::query()->count(),
        ];

        $this->seed(CatalogSeeder::class);

        $this->assertSame($counts, [
            Category::query()->count(),
            Store::query()->count(),
            Product::query()->count(),
            ProductImage::query()->count(),
            StoreImage::query()->count(),
            ProductHighlight::query()->count(),
            StoreHighlight::query()->count(),
        ]);
    }

    public function test_seeded_catalog_is_visible_through_the_public_api(): void
    {
        $this->seed(CatalogSeeder::class);

        $categories = collect($this->getJson('/api/categories?type=product')->assertOk()->json('data'));
        $this->assertTrue($categories->contains('display_name', 'Electronics - Audio'));

        $products = $this->getJson('/api/products?per_page=50')->assertOk();
        $this->assertSame(12, $products->json('meta.total'));
        $this->assertTrue(collect($products->json('data'))->pluck('name')->contains('Wireless Earbuds'));

        $stores = $this->getJson('/api/stores?per_page=50')->assertOk();
        $this->assertSame(10, $stores->json('meta.total'));
        $this->assertTrue(collect($stores->json('data'))->pluck('name')->contains("McDonald's"));

        $this->getJson('/api/home')
            ->assertOk()
            ->assertJsonPath('data.stats.products', 12)
            ->assertJsonPath('data.stats.stores', 10);
    }
}
