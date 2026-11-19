<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = Str::title(fake()->unique()->words(3, true));

        return [
            'store_id' => null,
            'category_id' => Category::factory()->product(),
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(1, 999999),
            'sku' => 'SKU-'.Str::upper(fake()->unique()->bothify('???-####')),
            'description' => fake()->sentence(12),
            'price' => fake()->randomFloat(2, 10, 5000),
            'original_price' => null,
            'stock' => fake()->numberBetween(1, 100),
            'is_new' => false,
            'is_active' => true,
            'created_by' => null,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (): array => ['is_active' => false]);
    }

    public function outOfStock(): static
    {
        return $this->state(fn (): array => ['stock' => 0]);
    }

    public function newArrival(): static
    {
        return $this->state(fn (): array => ['is_new' => true]);
    }

    public function forStore(Store $store): static
    {
        return $this->state(fn (): array => ['store_id' => $store->id]);
    }

    public function forCategory(Category $category): static
    {
        return $this->state(fn (): array => ['category_id' => $category->id]);
    }
}
