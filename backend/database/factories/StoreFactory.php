<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Store>
 */
class StoreFactory extends Factory
{
    protected $model = Store::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = Str::title(fake()->unique()->words(3, true));

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(1, 999999),
            'category_id' => Category::factory()->store(),
            'description' => fake()->paragraph(),
            'operating_hours' => '6:00AM - 11:00PM',
            'phone' => '09'.fake()->numerify('#########'),
            'image_path' => null,
            'is_open' => true,
            'floor_location' => 'Ground Floor',
        ];
    }

    public function closed(): static
    {
        return $this->state(fn (): array => ['is_open' => false]);
    }

    public function forCategory(Category $category): static
    {
        return $this->state(fn (): array => ['category_id' => $category->id]);
    }
}
