<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    private function customer(): User
    {
        return User::factory()->create();
    }

    /**
     * @param  array<int, array{0: Product, 1: int}>  $lines
     */
    private function makeOrder(User $user, string $status = 'pending', array $lines = []): Order
    {
        $order = Order::factory()->create([
            'user_id' => $user->id,
            'status' => $status,
        ]);

        $total = 0.0;

        foreach ($lines as [$product, $quantity]) {
            $unitPrice = (float) $product->price;
            $lineTotal = round($unitPrice * $quantity, 2);
            $total += $lineTotal;

            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'unit_price' => $unitPrice,
                'quantity' => $quantity,
                'line_total' => $lineTotal,
            ]);
        }

        if ($lines !== []) {
            $order->forceFill(['subtotal' => $total, 'total' => $total])->save();
        }

        return $order->refresh();
    }

    public function test_index_filters_by_active_history_and_specific_status(): void
    {
        $user = $this->customer();
        $pending = $this->makeOrder($user, 'pending');
        $ready = $this->makeOrder($user, 'ready');
        $claimed = $this->makeOrder($user, 'claimed');
        $cancelled = $this->makeOrder($user, 'cancelled');
        $notClaimed = $this->makeOrder($user, 'not_claimed');

        Sanctum::actingAs($user);

        $active = $this->getJson('/api/orders?status=active')->assertOk()->json('data');
        $this->assertEqualsCanonicalizing(
            [$pending->id, $ready->id],
            array_column($active, 'id'),
        );

        $history = $this->getJson('/api/orders?status=history')->assertOk()->json('data');
        $this->assertEqualsCanonicalizing(
            [$claimed->id, $cancelled->id, $notClaimed->id],
            array_column($history, 'id'),
        );

        $pendingOnly = $this->getJson('/api/orders?status=pending')->assertOk()->json('data');
        $this->assertSame([$pending->id], array_column($pendingOnly, 'id'));

        $all = $this->getJson('/api/orders')->assertOk()->json('data');
        $this->assertCount(5, $all);
    }

    public function test_index_is_scoped_to_the_authenticated_customer(): void
    {
        $owner = $this->customer();
        $other = $this->customer();
        $ownerOrder = $this->makeOrder($owner);
        $this->makeOrder($other);

        Sanctum::actingAs($owner);
        $data = $this->getJson('/api/orders')->assertOk()->json('data');

        $this->assertCount(1, $data);
        $this->assertSame($ownerOrder->id, $data[0]['id']);
    }

    public function test_index_rejects_unknown_status_filter(): void
    {
        $user = $this->customer();
        Sanctum::actingAs($user);

        $this->getJson('/api/orders?status=bogus')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_show_returns_own_order_with_items_and_histories(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['price' => 100]);
        $order = $this->makeOrder($user, 'pending', [[$product, 2]]);

        Sanctum::actingAs($user);
        $data = $this->getJson("/api/orders/{$order->id}")->assertOk()->json('data');

        $this->assertSame($order->order_number, $data['order_number']);
        $this->assertSame('Pending', $data['status']);
        $this->assertSame('pending', $data['status_code']);
        $this->assertSame(1, $data['items_count']);
        $this->assertSame($product->name, $data['items'][0]['product_name']);
        $this->assertSame($product->name, $data['items'][0]['title']);
        $this->assertEquals(100.0, (float) $data['items'][0]['unit_price']);
        $this->assertSame(2, $data['items'][0]['quantity']);
        $this->assertNotNull($data['date_ordered']);
    }

    public function test_show_another_users_order_returns_404(): void
    {
        $owner = $this->customer();
        $intruder = $this->customer();
        $order = $this->makeOrder($owner);

        Sanctum::actingAs($intruder);
        $this->getJson("/api/orders/{$order->id}")->assertNotFound();
    }

    public function test_cancel_pending_order_restores_stock_and_notifies(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['price' => 100, 'stock' => 5]);
        $order = $this->makeOrder($user, 'pending', [[$product, 2]]);

        Sanctum::actingAs($user);
        $response = $this->patchJson("/api/orders/{$order->id}/cancel")->assertOk();

        $data = $response->json('data');
        $this->assertSame('cancelled', $data['status_code']);
        $this->assertSame('Cancelled', $data['status']);
        $this->assertNotNull($data['cancelled_at']);
        $this->assertSame($user->id, $data['cancelled_by']);

        $order->refresh();
        $this->assertSame('cancelled', $order->statusValue());
        $this->assertSame(7, $product->fresh()->stock);
        $this->assertDatabaseHas('order_status_histories', [
            'order_id' => $order->id,
            'from_status' => 'pending',
            'to_status' => 'cancelled',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'category' => 'order',
            'title' => 'Order Cancelled',
        ]);
    }

    public function test_cancel_is_rejected_for_non_pending_orders(): void
    {
        $user = $this->customer();
        $order = $this->makeOrder($user, 'ready');

        Sanctum::actingAs($user);
        $this->patchJson("/api/orders/{$order->id}/cancel")
            ->assertStatus(409)
            ->assertJsonPath('code', 'invalid_order_status');

        $this->assertSame('ready', $order->fresh()->statusValue());
    }

    public function test_cancel_another_users_order_returns_404(): void
    {
        $owner = $this->customer();
        $intruder = $this->customer();
        $order = $this->makeOrder($owner);

        Sanctum::actingAs($intruder);
        $this->patchJson("/api/orders/{$order->id}/cancel")->assertNotFound();

        $this->assertSame('pending', $order->fresh()->statusValue());
    }

    public function test_cancel_is_idempotent_only_once_then_rejected(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['stock' => 5]);
        $order = $this->makeOrder($user, 'pending', [[$product, 1]]);

        Sanctum::actingAs($user);
        $this->patchJson("/api/orders/{$order->id}/cancel")->assertOk();

        // Stock restored exactly once; a second cancel must not restore again.
        $this->assertSame(6, $product->fresh()->stock);

        $this->patchJson("/api/orders/{$order->id}/cancel")
            ->assertStatus(409)
            ->assertJsonPath('code', 'invalid_order_status');

        $this->assertSame(6, $product->fresh()->stock);
    }

    public function test_worker_cannot_use_customer_order_endpoints(): void
    {
        Sanctum::actingAs(User::factory()->worker()->create());

        $this->getJson('/api/orders')->assertForbidden();
    }
}
