<?php

namespace Database\Factories;

use App\Enums\NotificationCategory;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Notification>
 */
class NotificationFactory extends Factory
{
    protected $model = Notification::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->state([
                'role' => 'customer',
                'status' => 'active',
            ]),
            'category' => fake()->randomElement(NotificationCategory::values()),
            'title' => fake()->sentence(3),
            'body' => fake()->sentence(10),
            'read_at' => null,
        ];
    }

    public function read(): static
    {
        return $this->state(fn () => ['read_at' => now()]);
    }

    public function unread(): static
    {
        return $this->state(fn () => ['read_at' => null]);
    }

    public function category(NotificationCategory|string $category): static
    {
        return $this->state(fn () => [
            'category' => $category instanceof NotificationCategory ? $category->value : $category,
        ]);
    }
}
