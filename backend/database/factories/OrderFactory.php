<?php

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        $total = fake()->randomFloat(2, 100, 5000);

        return [
            'order_number' => 'OM-TEST-'.fake()->unique()->numerify('######'),
            'user_id' => User::factory()->state([
                'role' => 'customer',
                'status' => 'active',
            ]),
            'status' => OrderStatus::Pending->value,
            'subtotal' => $total,
            'total' => $total,
            'payment_method' => 'pay_at_mall',
            'payment_status' => 'unpaid',
            'pickup_location' => 'Online Mall Cordova - Pickup Counter',
            'notes' => null,
        ];
    }

    public function pending(): static
    {
        return $this->state(fn () => ['status' => OrderStatus::Pending->value]);
    }

    public function ready(): static
    {
        return $this->state(fn () => [
            'status' => OrderStatus::Ready->value,
            'ready_at' => now(),
            'claim_deadline' => now()->addDays(3),
        ]);
    }

    public function claimed(): static
    {
        return $this->state(fn () => [
            'status' => OrderStatus::Claimed->value,
            'payment_status' => 'paid',
            'ready_at' => now()->subDay(),
            'claim_deadline' => now()->addDays(2),
            'claimed_at' => now(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn () => [
            'status' => OrderStatus::Cancelled->value,
            'cancelled_at' => now(),
        ]);
    }

    public function notClaimed(): static
    {
        return $this->state(fn () => [
            'status' => OrderStatus::NotClaimed->value,
            'ready_at' => now()->subDays(5),
            'claim_deadline' => now()->subDays(2),
            'not_claimed_at' => now(),
        ]);
    }
}
