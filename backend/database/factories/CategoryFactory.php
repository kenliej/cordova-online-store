<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = Str::title(fake()->unique()->words(2, true));

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(1, 999999),
            'type' => Category::TYPE_PRODUCT,
            'parent_id' => null,
            'sort_order' => fake()->numberBetween(0, 20),
        ];
    }

    public function product(): static
    {
        return $this->state(fn (): array => ['type' => Category::TYPE_PRODUCT]);
    }

    public function storeCategory(): static
    {
        return $this->state(fn (): array => ['type' => Category::TYPE_STORE]);
    }

    public function childOf(Category $parent): static
    {
        return $this->state(fn (): array => [
            'type' => $parent->type,
            'parent_id' => $parent->id,
        ]);
    }
}
