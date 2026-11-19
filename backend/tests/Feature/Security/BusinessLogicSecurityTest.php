<?php

namespace Tests\Feature\Security;

use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * A04 — Business-logic abuse: price/stock tampering, oversell, invalid state
 * transitions, double checkout, bad-record auto-ban and the unclaimed-order job.
 *
 * Money and stock are always authoritative in the database; the state machine
 * is the only way an order status changes (spec §6).
 */
class BusinessLogicSecurityTest extends TestCase
{
    use RefreshDatabase, SecurityTestSupport;

    private function customer(): User
    {
        return User::factory()->customer()->create();
    }

    private function addToCart(User $user, Product $product, int $quantity): int
    {
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/cart/items', [
            'product_id' => $product->getKey(),
            'quantity' => $quantity,
        ])->assertSuccessful();

        return (int) $response->json('data.item.id');
    }

    private function makeReadyOrderWithItem(User $customer, Product $product, int $quantity, Carbon $deadline): Order
    {
        $order = Order::factory()->ready()->create([
            'user_id' => $customer->getKey(),
            'claim_deadline' => $deadline,
        ]);

        OrderItem::create([
            'order_id' => $order->getKey(),
            'product_id' => $product->getKey(),
            'product_name' => $product->name,
            'unit_price' => (float) $product->price,
            'quantity' => $quantity,
            'line_total' => (float) $product->price * $quantity,
        ]);

        return $order;
    }

    public function test_checkout_recomputes_totals_and_ignores_client_money_and_status_fields(): void
    {
        $customer = $this->customer();
        $product = Product::factory()->create(['price' => 100, 'stock' => 5]);
        $itemId = $this->addToCart($customer, $product, 2);

        Sanctum::actingAs($customer);
        $response = $this->postJson('/api/checkout', [
            'item_ids' => [$itemId],
            'subtotal' => 0.01,
            'total' => 0.01,
            'status' => 'claimed',
            'payment_status' => 'paid',
            'items' => [['unit_price' => 0.01, 'quantity' => 99]],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status_code', 'pending')
            ->assertJsonPath('data.payment_status', 'unpaid');

        $order = Order::query()->latest('id')->firstOrFail();
        $this->assertEquals(200.0, (float) $order->total);
        $this->assertEquals(200.0, (float) $order->subtotal);
        $this->assertSame('pending', $order->statusValue());
        $this->assertEquals(100.0, (float) $order->items()->firstOrFail()->unit_price);
        $this->assertSame(3, $product->fresh()->stock);
    }

    public function test_negative_zero_and_excessive_quantities_are_rejected(): void
    {
        $customer = $this->customer();
        $product = Product::factory()->create(['stock' => 10]);
        $this->addToCart($customer, $product, 1);
        $item = CartItem::query()->firstOrFail();

        Sanctum::actingAs($customer);
        foreach ([0, -1, -999, 1000] as $quantity) {
            $this->postJson('/api/cart/items', [
                'product_id' => $product->getKey(),
                'quantity' => $quantity,
            ])->assertStatus(422)->assertJsonValidationErrors('quantity');

            $this->patchJson('/api/cart/items/'.$item->getKey(), [
                'quantity' => $quantity,
            ])->assertStatus(422)->assertJsonValidationErrors('quantity');
        }

        $this->assertSame(1, (int) $item->fresh()->quantity);
        $this->assertSame(10, $product->fresh()->stock);
    }

    public function test_cart_operations_cannot_exceed_stock(): void
    {
        $customer = $this->customer();
        $product = Product::factory()->create(['stock' => 1]);

        Sanctum::actingAs($customer);
        $this->postJson('/api/cart/items', ['product_id' => $product->getKey(), 'quantity' => 2])
            ->assertStatus(409)->assertJsonPath('code', 'insufficient_stock');

        $this->postJson('/api/cart/items', ['product_id' => $product->getKey(), 'quantity' => 1])
            ->assertSuccessful();

        $this->postJson('/api/cart/items', ['product_id' => $product->getKey(), 'quantity' => 1])
            ->assertStatus(409)->assertJsonPath('code', 'insufficient_stock');

        $this->assertSame(1, (int) CartItem::query()->firstOrFail()->quantity);
    }

    public function test_last_unit_cannot_be_oversold_when_two_customers_race(): void
    {
        $product = Product::factory()->create(['stock' => 1, 'price' => 50]);
        $alice = $this->customer();
        $bob = $this->customer();

        $this->addToCart($alice, $product, 1);
        $this->addToCart($bob, $product, 1);
        $this->assertSame(1, (int) $product->fresh()->stock, 'Cart reservation must not decrement stock.');

        Sanctum::actingAs($alice);
        $this->postJson('/api/checkout', ['select_all' => true])->assertCreated();
        $this->assertSame(0, $product->fresh()->stock);

        Sanctum::actingAs($bob);
        $this->postJson('/api/checkout', ['select_all' => true])
            ->assertStatus(409)
            ->assertJsonPath('code', 'insufficient_stock');

        $this->assertSame(1, Order::query()->count());
        $this->assertSame(0, $product->fresh()->stock);
        $this->assertSame(1, CartItem::query()->count(), 'Failed checkout must keep the cart rows.');
    }

    public function test_empty_cart_checkout_returns_409(): void
    {
        $customer = $this->customer();
        Sanctum::actingAs($customer);

        $this->postJson('/api/checkout', [])
            ->assertStatus(409)
            ->assertJsonPath('code', 'empty_cart');

        $this->postJson('/api/checkout', ['item_ids' => [12345]])
            ->assertStatus(409)
            ->assertJsonPath('code', 'cart_item_invalid');
    }

    public function test_double_checkout_does_not_duplicate_orders_or_decrement_stock_twice(): void
    {
        $customer = $this->customer();
        $product = Product::factory()->create(['stock' => 5, 'price' => 10]);
        $this->addToCart($customer, $product, 2);

        Sanctum::actingAs($customer);
        $this->postJson('/api/checkout', ['select_all' => true])->assertCreated();
        $this->postJson('/api/checkout', ['select_all' => true])
            ->assertStatus(409)
            ->assertJsonPath('code', 'empty_cart');

        $this->assertSame(1, Order::query()->count());
        $this->assertSame(3, $product->fresh()->stock);
        $this->assertSame(0, CartItem::query()->count());
    }

    public function test_checkout_only_consumes_selected_items(): void
    {
        $customer = $this->customer();
        $selected = Product::factory()->create(['stock' => 5, 'price' => 10]);
        $unselected = Product::factory()->create(['stock' => 5, 'price' => 20]);

        $selectedItem = $this->addToCart($customer, $selected, 1);
        $this->addToCart($customer, $unselected, 2);

        Sanctum::actingAs($customer);
        $this->postJson('/api/checkout', ['item_ids' => [$selectedItem]])->assertCreated();

        $this->assertSame(4, $selected->fresh()->stock);
        $this->assertSame(5, $unselected->fresh()->stock);
        $this->assertSame(1, CartItem::query()->count());
        $this->assertSame($unselected->getKey(), CartItem::query()->firstOrFail()->product_id);
    }

    public function test_checkout_is_atomic_when_any_line_is_out_of_stock(): void
    {
        $customer = $this->customer();
        $fine = Product::factory()->create(['stock' => 5, 'price' => 10]);
        $scarce = Product::factory()->create(['stock' => 2, 'price' => 10]);

        $this->addToCart($customer, $fine, 1);
        $this->addToCart($customer, $scarce, 2);

        // Another actor buys the scarce stock between add-to-cart and checkout.
        $scarce->forceFill(['stock' => 1])->save();

        Sanctum::actingAs($customer);
        $this->postJson('/api/checkout', ['select_all' => true])
            ->assertStatus(409)
            ->assertJsonPath('code', 'insufficient_stock');

        $this->assertSame(0, Order::query()->count());
        $this->assertSame(5, $fine->fresh()->stock, 'No stock may be decremented when checkout aborts.');
        $this->assertSame(1, $scarce->fresh()->stock);
        $this->assertSame(2, CartItem::query()->count(), 'Cart must be preserved on failure.');
    }

    public function test_customer_can_only_cancel_pending_orders_and_stock_is_restored_exactly_once(): void
    {
        $customer = $this->customer();
        $product = Product::factory()->create(['stock' => 5, 'price' => 10]);
        $this->addToCart($customer, $product, 2);
        Sanctum::actingAs($customer);
        $this->postJson('/api/checkout', ['select_all' => true])->assertCreated();

        $order = Order::query()->latest('id')->firstOrFail();
        $this->assertSame(3, $product->fresh()->stock);

        $this->patchJson('/api/orders/'.$order->getKey().'/cancel')
            ->assertOk()
            ->assertJsonPath('data.status_code', 'cancelled');
        $this->assertSame(5, $product->fresh()->stock);

        $this->patchJson('/api/orders/'.$order->getKey().'/cancel')->assertStatus(409);
        $this->assertSame(5, $product->fresh()->stock, 'Second cancel must not restore stock again.');

        // A ready order cannot be cancelled by the customer.
        $ready = Order::factory()->ready()->create(['user_id' => $customer->getKey()]);
        $this->patchJson('/api/orders/'.$ready->getKey().'/cancel')
            ->assertStatus(409)
            ->assertJsonPath('code', 'invalid_order_status');
        $this->assertSame('ready', $ready->fresh()->statusValue());
    }

    public function test_customer_cannot_forge_order_status_through_cancel_payload_or_worker_route(): void
    {
        $customer = $this->customer();
        $order = Order::factory()->pending()->create(['user_id' => $customer->getKey()]);

        Sanctum::actingAs($customer);
        $this->patchJson('/api/worker/orders/'.$order->getKey().'/status', ['status' => 'claimed'])
            ->assertForbidden();

        // The cancel endpoint only ever transitions pending -> cancelled.
        $this->patchJson('/api/orders/'.$order->getKey().'/cancel', ['status' => 'claimed'])
            ->assertOk()
            ->assertJsonPath('data.status_code', 'cancelled');

        $this->assertSame('cancelled', $order->fresh()->statusValue());
        $this->assertSame('unpaid', $order->fresh()->payment_status);
    }

    public function test_worker_forged_state_transitions_are_rejected(): void
    {
        $order = Order::factory()->pending()->create();
        $this->asWorker();

        foreach (['claimed', 'not_claimed'] as $illegal) {
            $this->patchJson('/api/worker/orders/'.$order->getKey().'/status', ['status' => $illegal])
                ->assertStatus(409)
                ->assertJsonPath('code', 'invalid_order_status');
        }

        $this->patchJson('/api/worker/orders/'.$order->getKey().'/status', ['status' => 'ready'])->assertOk();

        foreach (['ready', 'cancelled'] as $illegalFromReady) {
            $this->patchJson('/api/worker/orders/'.$order->getKey().'/status', ['status' => $illegalFromReady])
                ->assertStatus(409)
                ->assertJsonPath('code', 'invalid_order_status');
        }

        $this->patchJson('/api/worker/orders/'.$order->getKey().'/status', ['status' => 'claimed'])->assertOk();

        // Terminal states are immutable.
        foreach (['ready', 'claimed', 'cancelled', 'not_claimed'] as $illegal) {
            $this->patchJson('/api/worker/orders/'.$order->getKey().'/status', ['status' => $illegal])
                ->assertStatus(409);
        }

        $this->assertSame('claimed', $order->fresh()->statusValue());
    }

    public function test_claim_deadline_is_exactly_three_days_after_ready(): void
    {
        $order = Order::factory()->pending()->create();
        $this->asWorker();

        $response = $this->patchJson('/api/worker/orders/'.$order->getKey().'/status', ['status' => 'ready'])
            ->assertOk();

        $readyAt = Carbon::parse($response->json('data.ready_at'));
        $deadline = Carbon::parse($response->json('data.claim_deadline'));

        $this->assertSame(
            $readyAt->copy()->addDays(3)->toIso8601String(),
            $deadline->toIso8601String(),
            'Claim deadline must be ready_at + 3 days (§5 worker transitions).',
        );
    }

    public function test_not_claimed_records_penalties_and_bans_on_second_unclaimed_order(): void
    {
        $customer = User::factory()->create(['bad_records' => 0]);
        $product = Product::factory()->create(['stock' => 5]);

        $first = $this->makeReadyOrderWithItem($customer, $product, 2, now()->subHour());
        $second = $this->makeReadyOrderWithItem($customer, $product, 1, now()->subHour());

        $this->asWorker();
        $this->patchJson('/api/worker/orders/'.$first->getKey().'/status', ['status' => 'not_claimed'])
            ->assertOk();

        $customer->refresh();
        $this->assertSame(1, $customer->bad_records);
        $this->assertSame('active', $customer->status->value);
        $this->assertSame(7, $product->fresh()->stock, 'Stock must be restored once for the unclaimed order.');
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->getKey(),
            'title' => 'Order Not Claimed',
        ]);

        $sessionId = $this->sessionRowFor($customer);
        $this->patchJson('/api/worker/orders/'.$second->getKey().'/status', ['status' => 'not_claimed'])
            ->assertOk();

        $customer->refresh();
        $this->assertSame(2, $customer->bad_records);
        $this->assertSame('banned', $customer->status->value);
        $this->assertDatabaseMissing('sessions', ['id' => $sessionId]);

        // Terminal order: stock is never restored twice.
        $stockAfterBan = $product->fresh()->stock;
        $this->patchJson('/api/worker/orders/'.$second->getKey().'/status', ['status' => 'not_claimed'])
            ->assertStatus(409);
        $this->assertSame($stockAfterBan, $product->fresh()->stock);
    }

    public function test_mark_unclaimed_command_is_idempotent_and_ignores_future_deadlines(): void
    {
        $customer = User::factory()->create(['bad_records' => 0]);
        $product = Product::factory()->create(['stock' => 5]);

        $overdue = $this->makeReadyOrderWithItem($customer, $product, 2, now()->subDay());
        $future = $this->makeReadyOrderWithItem($customer, $product, 1, now()->addDay());

        $this->artisan('orders:mark-unclaimed')
            ->expectsOutputToContain('Marked 1 overdue order(s)')
            ->assertExitCode(0);

        $this->assertSame('not_claimed', $overdue->fresh()->statusValue());
        $this->assertSame('ready', $future->fresh()->statusValue(), 'Future deadlines must not be touched.');
        $this->assertSame(7, $product->fresh()->stock);
        $this->assertSame(1, $customer->fresh()->bad_records);

        // Second run must not double-process or double-restore anything.
        $this->artisan('orders:mark-unclaimed')->assertExitCode(0);
        $this->assertSame(7, $product->fresh()->stock);
        $this->assertSame(1, $customer->fresh()->bad_records);
        $this->assertSame(1, Order::query()->where('status', 'not_claimed')->count());
    }

    public function test_admin_cannot_remove_self_or_another_admin(): void
    {
        $admin = $this->asAdmin();
        $otherAdmin = User::factory()->admin()->create();

        $this->postJson('/api/admin/accounts/'.$admin->getKey().'/remove')
            ->assertForbidden()
            ->assertJsonPath('code', 'cannot_remove_admin'); // admins are never removable, self included

        $this->postJson('/api/admin/accounts/'.$otherAdmin->getKey().'/remove')
            ->assertForbidden()
            ->assertJsonPath('code', 'cannot_remove_admin');

        $this->postJson('/api/admin/accounts/'.$otherAdmin->getKey().'/restore')
            ->assertForbidden()
            ->assertJsonPath('code', 'cannot_restore_admin');

        $this->assertSame('active', $admin->fresh()->status->value);
        $this->assertSame('active', $otherAdmin->fresh()->status->value);
    }

    public function test_removing_a_bad_record_customer_bans_instead_of_removing(): void
    {
        $customer = User::factory()->withBadRecords(2)->create();
        $this->asAdmin();

        $this->postJson('/api/admin/accounts/'.$customer->getKey().'/remove')
            ->assertOk()
            ->assertJsonPath('data.status', 'banned');
    }

    public function test_pending_accounts_cannot_checkout_even_with_a_forced_session(): void
    {
        $pending = User::factory()->pending()->create();
        Sanctum::actingAs($pending);

        $this->postJson('/api/checkout', [])->assertForbidden();
        $this->getJson('/api/cart')->assertForbidden();
    }
}
