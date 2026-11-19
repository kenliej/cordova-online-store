<?php

namespace Tests\Feature\Catalog;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogHomeTest extends TestCase
{
    use CatalogStoreTestSupport, CatalogTestSupport, RefreshDatabase;

    public function test_home_payload_is_public_and_fully_shaped(): void
    {
        $category = $this->productCategory(['name' => 'Electronics', 'slug' => 'electronics']);

        Product::factory()->newArrival()->create([
            'name' => 'Wireless Earbuds',
            'slug' => 'wireless-earbuds',
            'category_id' => $category->id,
        ]);
        Product::factory()->outOfStock()->create(['name' => 'Sold Out', 'slug' => 'sold-out']);
        Product::factory()->inactive()->create(['name' => 'Hidden', 'slug' => 'hidden']);

        $this->store(['name' => 'McDonalds', 'slug' => 'mcdonalds']);

        $response = $this->getJson('/api/home')->assertOk();

        $response->assertJsonStructure([
            'data' => [
                'new_arrivals' => [['id', 'name', 'slug', 'price', 'image', 'category']],
                'featured_products' => [['id', 'name', 'slug', 'price', 'image', 'category']],
                'stores' => [['id', 'name', 'slug', 'category', 'is_open']],
                'stats' => ['products', 'stores'],
            ],
        ]);

        $newArrivalSlugs = collect($response->json('data.new_arrivals'))->pluck('slug');
        $featuredSlugs = collect($response->json('data.featured_products'))->pluck('slug');

        $this->assertTrue($newArrivalSlugs->contains('wireless-earbuds'));
        $this->assertFalse($newArrivalSlugs->contains('hidden'));
        $this->assertTrue($featuredSlugs->contains('wireless-earbuds'));
        $this->assertFalse($featuredSlugs->contains('sold-out'));
        $this->assertFalse($featuredSlugs->contains('hidden'));

        $this->assertSame(2, $response->json('data.stats.products'));
        $this->assertSame(1, $response->json('data.stats.stores'));
    }

    public function test_home_limits_products_and_stores(): void
    {
        foreach (range(1, 12) as $i) {
            Product::factory()->create(['name' => "Product {$i}", 'slug' => "product-{$i}"]);
        }

        foreach (range(1, 10) as $i) {
            $this->store(['name' => "Store {$i}", 'slug' => "store-{$i}"]);
        }

        $response = $this->getJson('/api/home')->assertOk();

        $this->assertCount(8, $response->json('data.new_arrivals'));
        $this->assertCount(8, $response->json('data.featured_products'));
        $this->assertCount(8, $response->json('data.stores'));
        $this->assertSame(12, $response->json('data.stats.products'));
        $this->assertSame(10, $response->json('data.stats.stores'));
    }
}
