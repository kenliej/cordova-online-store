<?php

namespace Tests\Feature\Catalog;

use App\Models\Store;

/**
 * Small helpers shared by the catalog test suite: an "active store" factory
 * shortcut that keeps category fixtures unique.
 */
trait CatalogStoreTestSupport
{
    protected function fakeStore(array $attributes = []): Store
    {
        static $counter = 0;
        $counter++;

        $category = $this->storeCategory([
            'name' => 'Category '.$counter,
            'slug' => 'category-'.$counter,
        ]);

        return Store::factory()->create(array_merge([
            'category_id' => $category->id,
        ], $attributes));
    }

    protected function store(array $attributes = []): Store
    {
        return $this->fakeStore($attributes);
    }
}
