<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarkOverdueOrdersUnclaimedTest extends TestCase
{
    use RefreshDatabase;

    private function makeReadyOrderWithItem(User $customer, Product $product, int $quantity, \DateTimeInterface $deadline): Order
    {
        $order = Order::factory()->ready()->create([
            'user_id' => $customer->id,
            'claim_deadline' => $deadline,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'unit_price' => (float) $product->price,
            'quantity' => $quantity,
            'line_total' => (float) $product->price * $quantity,
        ]);

        return $order;
    }

    public function test_command_marks_overdue_ready_orders_as_not_claimed(): void
    {
        $customer = User::factory()->create(['bad_records' => 0]);
        $product = Product::factory()->create(['stock' => 10]);
        $order = $this->makeReadyOrderWithItem($customer, $product, 2, now()->subDay());

        $this->artisan('orders:mark-unclaimed')
            ->expectsOutputToContain('Marked 1 overdue order(s) as not claimed')
            ->assertExitCode(0);

        $order->refresh();
        $this->assertSame('not_claimed', $order->statusValue());
        $this->assertNotNull($order->not_claimed_at);
        $this->assertSame(12, $product->fresh()->stock);
        $this->assertSame(1, $customer->fresh()->bad_records);

        // System-triggered transition: no human actor recorded.
        $this->assertDatabaseHas('order_status_histories', [
            'order_id' => $order->id,
            'from_status' => 'ready',
            'to_status' => 'not_claimed',
            'changed_by' => null,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'order.status_changed',
            'actor_id' => null,
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'title' => 'Order Not Claimed',
        ]);
    }

    public function test_command_ignores_future_deadlines_and_non_ready_orders(): void
    {
        $customer = User::factory()->create();

        $future = $this->makeReadyOrderWithItem(
            $customer,
            Product::factory()->create(['stock' => 5]),
            1,
            now()->addDay(),
        );

        $pending = Order::factory()->pending()->create([
            'user_id' => $customer->id,
            'claim_deadline' => now()->subDay(),
        ]);

        $this->artisan('orders:mark-unclaimed')->assertExitCode(0);

        $this->assertSame('ready', $future->fresh()->statusValue());
        $this->assertSame('pending', $pending->fresh()->statusValue());
    }

    public function test_command_is_idempotent(): void
    {
        $customer = User::factory()->create(['bad_records' => 0]);
        $order = $this->makeReadyOrderWithItem(
            $customer,
            Product::factory()->create(['stock' => 5]),
            1,
            now()->subDay(),
        );

        $this->artisan('orders:mark-unclaimed')->assertExitCode(0);
        $this->artisan('orders:mark-unclaimed')
            ->expectsOutputToContain('Marked 0 overdue order(s) as not claimed')
            ->assertExitCode(0);

        $this->assertSame(1, $customer->fresh()->bad_records);
        $this->assertSame(1, OrderItem::query()->where('order_id', $order->id)->count());
    }

    public function test_command_respects_the_limit_option(): void
    {
        $customer = User::factory()->create();

        $first = $this->makeReadyOrderWithItem(
            $customer,
            Product::factory()->create(['stock' => 5]),
            1,
            now()->subDays(3),
        );
        $second = $this->makeReadyOrderWithItem(
            $customer,
            Product::factory()->create(['stock' => 5]),
            1,
            now()->subDays(2),
        );

        $this->artisan('orders:mark-unclaimed', ['--limit' => 1])
            ->expectsOutputToContain('Marked 1 overdue order(s) as not claimed')
            ->assertExitCode(0);

        // Oldest deadline first.
        $this->assertSame('not_claimed', $first->fresh()->statusValue());
        $this->assertSame('ready', $second->fresh()->statusValue());
    }
}
