<?php

namespace Tests\Feature\Orders;

use App\Models\CartItem;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    private function customer(): User
    {
        return User::factory()->create();
    }

    /**
     * Add a product to the customer's cart and return the cart item id.
     */
    private function addToCart(User $user, Product $product, int $quantity): int
    {
        Sanctum::actingAs($user);

        $data = $this->postJson('/api/cart/items', [
            'product_id' => $product->id,
            'quantity' => $quantity,
        ])->assertSuccessful()->json('data');

        return (int) $data['item']['id'];
    }

    public function test_checkout_creates_pending_order_with_snapshots_and_side_effects(): void
    {
        $user = $this->customer();
        $earbuds = Product::factory()->create(['name' => 'Wireless Earbuds', 'price' => 100, 'stock' => 10]);
        $noodles = Product::factory()->create(['name' => 'Instant Noodles', 'price' => 50, 'stock' => 10]);

        $itemA = $this->addToCart($user, $earbuds, 2);
        $itemB = $this->addToCart($user, $noodles, 3);

        Sanctum::actingAs($user);
        $response = $this->postJson('/api/checkout', ['item_ids' => [$itemA, $itemB]]);

        $response->assertCreated()->assertJsonPath('message', 'Checkout successful! Order placed.');

        $data = $response->json('data');
        $this->assertSame('pending', $data['status_code']);
        $this->assertSame('Pending', $data['status']);
        $this->assertEquals(350.0, (float) $data['total']);
        $this->assertEquals(350.0, (float) $data['subtotal']);
        $this->assertSame('unpaid', $data['payment_status']);
        $this->assertSame('pay_at_mall', $data['payment_method']);
        $this->assertSame('Online Mall Cordova - Pickup Counter', $data['pickup_location']);
        $this->assertMatchesRegularExpression('/^OM-\d{4}-\d{6}$/', $data['order_number']);
        $this->assertSame(2, $data['items_count']);
        $this->assertCount(1, $data['status_histories']);
        $this->assertSame('pending', $data['status_histories'][0]['to_status']);

        $names = collect($data['items'])->pluck('product_name')->all();
        $this->assertEqualsCanonicalizing(['Wireless Earbuds', 'Instant Noodles'], $names);

        $snapshot = collect($data['items'])->firstWhere('product_name', 'Wireless Earbuds');
        $this->assertSame(2, $snapshot['quantity']);
        $this->assertEquals(100.0, (float) $snapshot['unit_price']);
        $this->assertEquals(200.0, (float) $snapshot['line_total']);

        // Stock decremented exactly once.
        $this->assertSame(8, $earbuds->fresh()->stock);
        $this->assertSame(7, $noodles->fresh()->stock);

        // Purchased cart lines removed.
        $this->assertSame(0, CartItem::query()->count());

        // Notification + history written.
        $this->assertSame(1, Order::query()->count());
        $this->assertSame(1, OrderStatusHistory::query()->count());
        $notification = Notification::query()->firstOrFail();
        $this->assertSame($user->id, $notification->user_id);
        $this->assertSame('order', $notification->categoryValue());
        $this->assertSame('Order', $notification->title);
        $this->assertStringContainsString($data['order_number'], $notification->body);
        $this->assertNull($notification->read_at);
    }

    public function test_checkout_ignores_client_supplied_prices_and_totals(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['price' => 250, 'stock' => 5]);
        $itemId = $this->addToCart($user, $product, 2);

        Sanctum::actingAs($user);
        $response = $this->postJson('/api/checkout', [
            'item_ids' => [$itemId],
            // Forged money fields must be ignored (never trust the client, §2).
            'subtotal' => 1,
            'total' => 1,
            'items' => [['unit_price' => 1, 'quantity' => 99]],
        ])->assertCreated();

        $data = $response->json('data');
        $this->assertEquals(500.0, (float) $data['total']);
        $this->assertEquals(500.0, (float) $data['subtotal']);
        $this->assertEquals(250.0, (float) $data['items'][0]['unit_price']);
        $this->assertSame(2, $data['items'][0]['quantity']);
    }

    public function test_checkout_with_empty_cart_returns_409(): void
    {
        $user = $this->customer();
        Sanctum::actingAs($user);

        $this->postJson('/api/checkout', [])
            ->assertStatus(409)
            ->assertJsonPath('code', 'empty_cart');

        $this->assertSame(0, Order::query()->count());
    }

    public function test_checkout_with_no_selected_items_returns_empty_cart(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['stock' => 5]);
        $itemId = $this->addToCart($user, $product, 1);

        Sanctum::actingAs($user);
        $this->patchJson("/api/cart/items/{$itemId}", ['is_selected' => false])->assertOk();

        $this->postJson('/api/checkout', [])
            ->assertStatus(409)
            ->assertJsonPath('code', 'empty_cart');
    }

    public function test_checkout_insufficient_stock_rolls_back_everything(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['price' => 10, 'stock' => 5]);
        $itemId = $this->addToCart($user, $product, 3);

        // Simulate another shopper taking the stock after the item was added.
        $product->forceFill(['stock' => 1])->save();

        Sanctum::actingAs($user);
        $this->postJson('/api/checkout', ['item_ids' => [$itemId]])
            ->assertStatus(409)
            ->assertJsonPath('code', 'insufficient_stock');

        $this->assertSame(0, Order::query()->count());
        $this->assertSame(0, OrderItem::query()->count());
        $this->assertSame(1, $product->fresh()->stock);
        $this->assertDatabaseHas('cart_items', ['id' => $itemId]);
        $this->assertSame(0, Notification::query()->count());
    }

    public function test_checkout_with_inactive_product_is_rejected(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['stock' => 5]);
        $itemId = $this->addToCart($user, $product, 1);

        $product->forceFill(['is_active' => false])->save();

        Sanctum::actingAs($user);
        $this->postJson('/api/checkout', ['item_ids' => [$itemId]])
            ->assertStatus(409)
            ->assertJsonPath('code', 'product_unavailable');

        $this->assertSame(0, Order::query()->count());
    }

    public function test_checkout_rejects_another_users_cart_item(): void
    {
        $owner = $this->customer();
        $intruder = $this->customer();
        $product = Product::factory()->create(['stock' => 5]);
        $ownerItemId = $this->addToCart($owner, $product, 1);

        Sanctum::actingAs($intruder);
        $this->postJson('/api/checkout', ['item_ids' => [$ownerItemId]])
            ->assertStatus(409)
            ->assertJsonPath('code', 'cart_item_invalid');

        $this->assertSame(0, Order::query()->count());
        $this->assertDatabaseHas('cart_items', ['id' => $ownerItemId]);
    }

    public function test_checkout_select_all_purchases_every_cart_line(): void
    {
        $user = $this->customer();
        $first = Product::factory()->create(['price' => 40, 'stock' => 5]);
        $second = Product::factory()->create(['price' => 60, 'stock' => 5]);
        $this->addToCart($user, $first, 1);
        $this->addToCart($user, $second, 2);
        $unselected = $this->addToCart($user, Product::factory()->create(['price' => 10, 'stock' => 5]), 1);

        Sanctum::actingAs($user);
        $this->patchJson("/api/cart/items/{$unselected}", ['is_selected' => false])->assertOk();

        $data = $this->postJson('/api/checkout', ['select_all' => true])->assertCreated()->json('data');

        $this->assertSame(3, $data['items_count']);
        $this->assertEquals(170.0, (float) $data['total']);
        $this->assertSame(0, CartItem::query()->count());
    }

    public function test_checkout_uses_selected_flags_when_no_item_ids_are_sent(): void
    {
        $user = $this->customer();
        $selected = Product::factory()->create(['price' => 100, 'stock' => 5]);
        $skipped = Product::factory()->create(['price' => 999, 'stock' => 5]);
        $this->addToCart($user, $selected, 1);
        $skippedItemId = $this->addToCart($user, $skipped, 1);

        Sanctum::actingAs($user);
        $this->patchJson("/api/cart/items/{$skippedItemId}", ['is_selected' => false])->assertOk();

        $data = $this->postJson('/api/checkout')->assertCreated()->json('data');

        $this->assertSame(1, $data['items_count']);
        $this->assertEquals(100.0, (float) $data['total']);
        $this->assertDatabaseHas('cart_items', ['id' => $skippedItemId]);
    }

    public function test_checkout_rejects_unknown_item_ids(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['stock' => 5]);
        $this->addToCart($user, $product, 1);

        Sanctum::actingAs($user);
        $this->postJson('/api/checkout', ['item_ids' => [999999]])
            ->assertStatus(409)
            ->assertJsonPath('code', 'cart_item_invalid');
    }

    public function test_worker_cannot_checkout(): void
    {
        Sanctum::actingAs(User::factory()->worker()->create());

        $this->postJson('/api/checkout')->assertForbidden();
    }
}
