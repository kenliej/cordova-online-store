<?php

namespace Tests\Feature\Catalog;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogCategoriesTest extends TestCase
{
    use CatalogTestSupport, RefreshDatabase;

    public function test_category_list_is_public(): void
    {
        $this->getJson('/api/categories?type=product')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_product_categories_are_flat_with_parent_id_and_display_name(): void
    {
        $parent = $this->productCategory(['name' => 'Electronics', 'slug' => 'electronics']);
        $this->productCategory([
            'name' => 'Audio',
            'slug' => 'audio',
            'parent_id' => $parent->id,
            'sort_order' => 1,
        ]);

        $response = $this->getJson('/api/categories?type=product')->assertOk();

        $data = collect($response->json('data'));

        $this->assertTrue($data->contains(
            fn (array $row): bool => $row['display_name'] === 'Electronics - Audio'
                && $row['parent_id'] === $parent->id
        ));

        $this->assertTrue($data->contains(
            fn (array $row): bool => $row['display_name'] === 'Electronics'
                && $row['parent_id'] === null
        ));

        $response->assertJsonStructure([
            'data' => [['id', 'name', 'slug', 'type', 'parent_id', 'display_name', 'sort_order']],
        ]);
    }

    public function test_type_filter_returns_only_matching_categories(): void
    {
        $this->productCategory(['name' => 'Product Only', 'slug' => 'product-only']);
        $this->storeCategory(['name' => 'Store Only', 'slug' => 'store-only']);

        $names = collect($this->getJson('/api/categories?type=store')->assertOk()->json('data'))
            ->pluck('name');

        $this->assertTrue($names->contains('Store Only'));
        $this->assertFalse($names->contains('Product Only'));
    }

    public function test_categories_are_sorted_by_sort_order(): void
    {
        $this->productCategory(['name' => 'Zeta', 'slug' => 'zeta', 'sort_order' => 10]);
        $this->productCategory(['name' => 'Alpha', 'slug' => 'alpha', 'sort_order' => 1]);

        $names = collect($this->getJson('/api/categories?type=product')->json('data'))->pluck('name');

        $this->assertSame('Alpha', $names->first());
    }

    public function test_invalid_type_is_rejected(): void
    {
        $this->getJson('/api/categories?type=invalid')
            ->assertStatus(422)
            ->assertJsonValidationErrors('type');
    }

    public function test_top_level_filter_returns_only_parent_categories(): void
    {
        $parent = $this->productCategory(['name' => 'Parent Cat', 'slug' => 'parent-cat']);
        $this->productCategory([
            'name' => 'Child Cat',
            'slug' => 'child-cat',
            'parent_id' => $parent->id,
        ]);

        $names = collect(
            $this->getJson('/api/categories?type=product&parent_id=0')->assertOk()->json('data')
        )->pluck('name');

        $this->assertTrue($names->contains('Parent Cat'));
        $this->assertFalse($names->contains('Child Cat'));
    }
}
