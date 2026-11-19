<?php

namespace Tests\Feature\Worker;

use App\Enums\UserStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrdersTest extends TestCase
{
    use RefreshDatabase;

    private function worker(): User
    {
        return User::factory()->worker()->create();
    }

    private function customer(array $attributes = []): User
    {
        return User::factory()->create($attributes);
    }

    /**
     * @param  array<int, array{0: Product, 1: int}>  $lines
     */
    private function makeOrder(User $user, string $status = 'pending', array $lines = []): Order
    {
        $timestamps = match ($status) {
            'ready' => ['ready_at' => now(), 'claim_deadline' => now()->addDays(3)],
            'claimed' => ['ready_at' => now()->subDay(), 'claim_deadline' => now()->addDays(2), 'claimed_at' => now()],
            'cancelled' => ['cancelled_at' => now()],
            'not_claimed' => ['ready_at' => now()->subDays(5), 'claim_deadline' => now()->subDays(2), 'not_claimed_at' => now()],
            default => [],
        };

        $order = Order::factory()->create(array_merge([
            'user_id' => $user->id,
            'status' => $status,
        ], $timestamps));

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

    public function test_index_returns_paginated_orders_with_customer_and_items(): void
    {
        $worker = $this->worker();
        $customer = $this->customer(['name' => 'Sherwynn James Misula', 'phone' => '09171234567']);
        $product = Product::factory()->create(['name' => 'Wireless Earbuds', 'price' => 100]);
        $order = $this->makeOrder($customer, 'pending', [[$product, 2]]);

        Sanctum::actingAs($worker);
        $response = $this->getJson('/api/worker/orders')->assertOk();

        $data = $response->json('data');
        $meta = $response->json('meta');

        $this->assertCount(1, $data);
        $this->assertSame($order->id, $data[0]['id']);
        $this->assertSame($order->order_number, $data[0]['order_number']);
        $this->assertSame('Pending', $data[0]['status']);
        $this->assertSame('pending', $data[0]['status_code']);
        $this->assertNotNull($data[0]['date_ordered']);
        $this->assertEquals(200.0, (float) $data[0]['total_price']);
        $this->assertSame('Sherwynn James Misula', $data[0]['customer']['name']);
        $this->assertSame('09171234567', $data[0]['customer']['phone']);
        $this->assertSame(1, $data[0]['items_count']);

        $item = $data[0]['items'][0];
        $this->assertSame('Wireless Earbuds', $item['title']);
        $this->assertEquals(100.0, (float) $item['price']);
        $this->assertSame(2, $item['quantity']);
        $this->assertArrayHasKey('image', $item);

        $this->assertSame(1, $meta['current_page']);
        $this->assertSame(1, $meta['total']);
    }

    public function test_index_returns_frontend_contract_keys(): void
    {
        $worker = $this->worker();
        $customer = $this->customer(['name' => 'Contract Customer', 'phone' => '09170001111']);
        $product = Product::factory()->create(['name' => 'Contract Product', 'price' => 75]);
        $this->makeOrder($customer, 'ready', [[$product, 1]]);

        Sanctum::actingAs($worker);
        $order = $this->getJson('/api/worker/orders')->assertOk()->json('data.0');

        // Exact keys agreed with frontend-admin (order card + details modal).
        foreach ([
            'id',
            'order_number',
            'status',
            'status_code',
            'customer',
            'date_ordered',
            'date_ready',
            'claim_deadline',
            'total_price',
            'items',
            'status_histories',
        ] as $key) {
            $this->assertArrayHasKey($key, $order);
        }

        $this->assertSame('Ready to Claim', $order['status']);
        $this->assertSame('ready', $order['status_code']);
        $this->assertSame('Contract Customer', $order['customer']['name']);
        $this->assertSame('09170001111', $order['customer']['phone']);
        $this->assertNotNull($order['date_ordered']);
        $this->assertNotNull($order['date_ready']);
        $this->assertNotNull($order['claim_deadline']);
        $this->assertEquals(75.0, (float) $order['total_price']);

        $item = $order['items'][0];
        foreach (['id', 'title', 'price', 'quantity', 'image'] as $key) {
            $this->assertArrayHasKey($key, $item);
        }
        $this->assertSame('Contract Product', $item['title']);
        $this->assertEquals(75.0, (float) $item['price']);
        $this->assertSame(1, $item['quantity']);
    }

    public function test_index_filters_by_status_and_search(): void
    {
        $worker = $this->worker();
        $alice = $this->customer(['name' => 'Alice Smith']);
        $bob = $this->customer(['name' => 'Bob Jones']);

        $pending = $this->makeOrder($alice, 'pending');
        $ready = $this->makeOrder($bob, 'ready');

        Sanctum::actingAs($worker);

        $pendingList = $this->getJson('/api/worker/orders?status=pending')->assertOk()->json('data');
        $this->assertSame([$pending->id], array_column($pendingList, 'id'));

        $readyList = $this->getJson('/api/worker/orders?status=ready')->assertOk()->json('data');
        $this->assertSame([$ready->id], array_column($readyList, 'id'));

        $byName = $this->getJson('/api/worker/orders?search=Alice')->assertOk()->json('data');
        $this->assertSame([$pending->id], array_column($byName, 'id'));

        $byNumber = $this->getJson('/api/worker/orders?search='.$ready->order_number)->assertOk()->json('data');
        $this->assertSame([$ready->id], array_column($byNumber, 'id'));
    }

    public function test_show_returns_order_detail(): void
    {
        $worker = $this->worker();
        $customer = $this->customer();
        $product = Product::factory()->create(['price' => 50]);
        $order = $this->makeOrder($customer, 'ready', [[$product, 2]]);

        Sanctum::actingAs($worker);
        $data = $this->getJson("/api/worker/orders/{$order->id}")->assertOk()->json('data');

        $this->assertSame($order->id, $data['id']);
        $this->assertSame('Ready to Claim', $data['status']);
        $this->assertSame('ready', $data['status_code']);
        $this->assertNotNull($data['date_ready']);
        $this->assertNotNull($data['claim_deadline']);
        $this->assertEquals(100.0, (float) $data['total_price']);
        $this->assertSame($customer->name, $data['customer']['name']);
        $this->assertSame([], $data['status_histories']);
    }

    public function test_pending_to_ready_sets_window_and_notifies_customer(): void
    {
        $worker = $this->worker();
        $customer = $this->customer();
        $order = $this->makeOrder($customer, 'pending');

        Sanctum::actingAs($worker);
        $data = $this->patchJson("/api/worker/orders/{$order->id}/status", ['status' => 'ready'])
            ->assertOk()
            ->json('data');

        $this->assertSame('ready', $data['status_code']);
        $this->assertNotNull($data['date_ready']);
        $this->assertNotNull($data['claim_deadline']);

        $order->refresh();
        $this->assertNotNull($order->ready_at);
        $this->assertNotNull($order->claim_deadline);
        $this->assertEqualsWithDelta(
            $order->ready_at->copy()->addDays(3)->timestamp,
            $order->claim_deadline->timestamp,
            5,
        );

        $this->assertDatabaseHas('order_status_histories', [
            'order_id' => $order->id,
            'from_status' => 'pending',
            'to_status' => 'ready',
            'changed_by' => $worker->id,
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'title' => 'Order Ready',
            'category' => 'order',
        ]);
    }

    public function test_ready_to_claimed_marks_paid_and_timestamps(): void
    {
        $worker = $this->worker();
        $customer = $this->customer();
        $order = $this->makeOrder($customer, 'ready');

        Sanctum::actingAs($worker);
        $data = $this->patchJson("/api/worker/orders/{$order->id}/status", ['status' => 'claimed'])
            ->assertOk()
            ->json('data');

        $this->assertSame('claimed', $data['status_code']);
        $this->assertSame('Claimed', $data['status']);
        $this->assertNotNull($data['claimed_at']);

        $order->refresh();
        $this->assertSame('paid', $order->payment_status);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'title' => 'Order Claimed',
        ]);
    }

    public function test_ready_to_not_claimed_restores_stock_and_increments_bad_records(): void
    {
        $worker = $this->worker();
        $customer = $this->customer(['bad_records' => 0]);
        $product = Product::factory()->create(['stock' => 5]);
        $order = $this->makeOrder($customer, 'ready', [[$product, 2]]);

        Sanctum::actingAs($worker);
        $data = $this->patchJson("/api/worker/orders/{$order->id}/status", ['status' => 'not_claimed'])
            ->assertOk()
            ->json('data');

        $this->assertSame('not_claimed', $data['status_code']);
        $this->assertSame("Didn't Claimed", $data['status']);
        $this->assertNotNull($data['not_claimed_at']);

        $this->assertSame(7, $product->fresh()->stock);
        $this->assertSame(1, $customer->fresh()->bad_records);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'title' => 'Order Not Claimed',
        ]);
    }

    public function test_second_unclaimed_order_auto_bans_customer_and_revokes_tokens(): void
    {
        $worker = $this->worker();
        $customer = $this->customer(['bad_records' => 1]);

        $token = $customer->createToken('test-device')->plainTextToken;
        DB::table('sessions')->insert([
            'id' => 'session-for-ban-test',
            'user_id' => $customer->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit',
            'payload' => 'payload',
            'last_activity' => now()->getTimestamp(),
        ]);

        $order = $this->makeOrder($customer, 'ready');

        Sanctum::actingAs($worker);
        $this->patchJson("/api/worker/orders/{$order->id}/status", ['status' => 'not_claimed'])->assertOk();

        $fresh = $customer->fresh();
        $this->assertSame(2, $fresh->bad_records);
        $this->assertSame(UserStatus::Banned, $fresh->status);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $customer->id,
        ]);
        $this->assertDatabaseMissing('sessions', ['user_id' => $customer->id]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'title' => 'Account Banned',
            'category' => 'system',
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'customer.banned']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'order.status_changed']);
        $this->assertNotNull($token);
    }

    public function test_invalid_transitions_are_rejected_with_409(): void
    {
        $worker = $this->worker();
        $customer = $this->customer();

        $claimed = $this->makeOrder($customer, 'claimed');
        $pending = $this->makeOrder($customer, 'pending');
        $cancelled = $this->makeOrder($customer, 'cancelled');

        Sanctum::actingAs($worker);

        $this->patchJson("/api/worker/orders/{$claimed->id}/status", ['status' => 'ready'])
            ->assertStatus(409)
            ->assertJsonPath('code', 'invalid_order_status');

        $this->patchJson("/api/worker/orders/{$pending->id}/status", ['status' => 'claimed'])
            ->assertStatus(409)
            ->assertJsonPath('code', 'invalid_order_status');

        $this->patchJson("/api/worker/orders/{$cancelled->id}/status", ['status' => 'not_claimed'])
            ->assertStatus(409)
            ->assertJsonPath('code', 'invalid_order_status');
    }

    public function test_pending_to_cancelled_restores_stock_and_sets_cancelled_by(): void
    {
        $worker = $this->worker();
        $customer = $this->customer();
        $product = Product::factory()->create(['stock' => 5]);
        $order = $this->makeOrder($customer, 'pending', [[$product, 3]]);

        Sanctum::actingAs($worker);
        $data = $this->patchJson("/api/worker/orders/{$order->id}/status", ['status' => 'cancelled'])
            ->assertOk()
            ->json('data');

        $this->assertSame('cancelled', $data['status_code']);
        $this->assertSame($worker->id, $data['cancelled_by']);
        $this->assertSame(8, $product->fresh()->stock);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'title' => 'Order Cancelled',
        ]);
    }

    public function test_ui_label_status_alias_is_accepted(): void
    {
        $worker = $this->worker();
        $order = $this->makeOrder($this->customer(), 'pending');

        Sanctum::actingAs($worker);
        $this->patchJson("/api/worker/orders/{$order->id}/status", ['status' => 'Ready to Claim'])
            ->assertOk()
            ->assertJsonPath('data.status_code', 'ready');
    }

    public function test_invalid_or_missing_status_is_rejected_with_422(): void
    {
        $worker = $this->worker();
        $order = $this->makeOrder($this->customer(), 'pending');

        Sanctum::actingAs($worker);

        $this->patchJson("/api/worker/orders/{$order->id}/status", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        $this->patchJson("/api/worker/orders/{$order->id}/status", ['status' => 'processing'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_customer_cannot_access_worker_order_routes(): void
    {
        $customer = $this->customer();
        $order = $this->makeOrder($customer, 'pending');

        Sanctum::actingAs($customer);

        $this->getJson('/api/worker/orders')->assertForbidden();
        $this->patchJson("/api/worker/orders/{$order->id}/status", ['status' => 'ready'])->assertForbidden();
    }

    public function test_admin_can_access_worker_order_routes(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->getJson('/api/worker/orders')->assertOk();
    }

    public function test_unauthenticated_worker_request_is_unauthorized(): void
    {
        $this->getJson('/api/worker/orders')->assertUnauthorized();
    }
}
