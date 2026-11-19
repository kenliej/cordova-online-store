<?php

namespace Tests\Feature\Cart;

use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CartTest extends TestCase
{
    use RefreshDatabase;

    private function customer(): User
    {
        return User::factory()->create();
    }

    private function addItem(User $user, Product $product, int $quantity = 1): CartItem
    {
        Sanctum::actingAs($user);

        $this->postJson('/api/cart/items', [
            'product_id' => $product->id,
            'quantity' => $quantity,
        ])->assertSuccessful();

        return CartItem::query()
            ->whereHas('cart', fn ($query) => $query->where('user_id', $user->id))
            ->where('product_id', $product->id)
            ->firstOrFail();
    }

    public function test_get_cart_returns_items_with_product_data_and_summary(): void
    {
        $user = $this->customer();
        $cheap = Product::factory()->create(['name' => 'Instant Noodles', 'price' => 50, 'stock' => 30]);
        $premium = Product::factory()->create(['name' => 'Wireless Earbuds', 'price' => 100, 'stock' => 10]);

        $first = $this->addItem($user, $cheap, 2);
        $second = $this->addItem($user, $premium, 1);

        // Unselect the second line: summary must only count the selected line.
        $this->patchJson("/api/cart/items/{$second->id}", ['is_selected' => false])->assertOk();

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/cart')->assertOk();

        $data = $response->json('data');
        $this->assertCount(2, $data['items']);
        $this->assertSame(2, $data['summary']['item_count']);
        $this->assertSame(2, $data['summary']['selected_count']);
        $this->assertEquals(100.0, $data['summary']['total']);

        $item = collect($data['items'])->firstWhere('id', $first->id);
        $this->assertSame('Instant Noodles', $item['title']);
        $this->assertSame(50.0, (float) $item['unit_price']);
        $this->assertSame(2, $item['quantity']);
        $this->assertEquals(100.0, $item['line_total']);
        $this->assertTrue($item['is_selected']);
        $this->assertSame(30, $item['stock']);
        $this->assertSame($cheap->id, $item['product']['id']);
        $this->assertNull($item['image']);

        Sanctum::actingAs($user);
        $this->assertDatabaseHas('carts', ['user_id' => $user->id]);
    }

    public function test_adding_same_product_twice_increments_quantity(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['price' => 25, 'stock' => 10]);

        $this->addItem($user, $product, 2);
        $this->addItem($user, $product, 3);

        Sanctum::actingAs($user);
        $data = $this->getJson('/api/cart')->assertOk()->json('data');

        $this->assertCount(1, $data['items']);
        $this->assertSame(5, $data['items'][0]['quantity']);
        $this->assertSame(1, CartItem::query()->count());
    }

    public function test_add_item_rejects_quantity_above_stock(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['stock' => 2]);
        Sanctum::actingAs($user);

        $this->postJson('/api/cart/items', ['product_id' => $product->id, 'quantity' => 3])
            ->assertStatus(409)
            ->assertJsonPath('code', 'insufficient_stock');

        $this->assertDatabaseCount('cart_items', 0);
    }

    public function test_add_item_rejects_inactive_product(): void
    {
        $user = $this->customer();
        $product = Product::factory()->inactive()->create(['stock' => 5]);
        Sanctum::actingAs($user);

        $this->postJson('/api/cart/items', ['product_id' => $product->id, 'quantity' => 1])
            ->assertStatus(409)
            ->assertJsonPath('code', 'product_unavailable');
    }

    public function test_add_item_returns_404_for_soft_deleted_product(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['stock' => 5]);
        $product->delete();

        Sanctum::actingAs($user);
        $this->postJson('/api/cart/items', ['product_id' => $product->id, 'quantity' => 1])
            ->assertNotFound();
    }

    public function test_add_item_validates_payload(): void
    {
        Sanctum::actingAs($this->customer());

        $this->postJson('/api/cart/items', ['quantity' => 0])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['product_id', 'quantity']);
    }

    public function test_update_item_quantity_and_selection(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['price' => 20, 'stock' => 10]);
        $item = $this->addItem($user, $product);

        Sanctum::actingAs($user);

        $data = $this->patchJson("/api/cart/items/{$item->id}", ['quantity' => 4])
            ->assertOk()
            ->json('data');

        $this->assertSame(4, $data['item']['quantity']);
        $this->assertEquals(80.0, $data['summary']['total']);

        $data = $this->patchJson("/api/cart/items/{$item->id}", ['is_selected' => false])
            ->assertOk()
            ->json('data');

        $this->assertFalse($data['item']['is_selected']);
        $this->assertSame(0, $data['summary']['selected_count']);
    }

    public function test_update_item_quantity_above_stock_is_rejected(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['stock' => 3]);
        $item = $this->addItem($user, $product);

        Sanctum::actingAs($user);
        $this->patchJson("/api/cart/items/{$item->id}", ['quantity' => 4])
            ->assertStatus(409)
            ->assertJsonPath('code', 'insufficient_stock');
    }

    public function test_cannot_update_or_delete_another_users_cart_item(): void
    {
        $owner = $this->customer();
        $intruder = $this->customer();
        $product = Product::factory()->create(['stock' => 5]);
        $item = $this->addItem($owner, $product);

        Sanctum::actingAs($intruder);
        $this->patchJson("/api/cart/items/{$item->id}", ['quantity' => 2])->assertNotFound();
        $this->deleteJson("/api/cart/items/{$item->id}")->assertNotFound();

        $this->assertDatabaseHas('cart_items', ['id' => $item->id]);
    }

    public function test_delete_item_returns_204_and_removes_row(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['stock' => 5]);
        $item = $this->addItem($user, $product);

        Sanctum::actingAs($user);
        $this->deleteJson("/api/cart/items/{$item->id}")->assertNoContent();

        $this->assertDatabaseMissing('cart_items', ['id' => $item->id]);
    }

    public function test_clear_removes_only_selected_items_when_requested(): void
    {
        $user = $this->customer();
        $first = Product::factory()->create(['stock' => 5]);
        $second = Product::factory()->create(['stock' => 5]);
        $this->addItem($user, $first);
        $secondItem = $this->addItem($user, $second);

        Sanctum::actingAs($user);
        $this->patchJson("/api/cart/items/{$secondItem->id}", ['is_selected' => false])->assertOk();
        $this->deleteJson('/api/cart/items?selected=1')->assertOk();

        $remaining = CartItem::query()->whereHas('cart', fn ($q) => $q->where('user_id', $user->id))->get();
        $this->assertCount(1, $remaining);
        $this->assertSame($secondItem->id, $remaining->first()->id);
    }

    public function test_clear_removes_everything(): void
    {
        $user = $this->customer();
        $first = Product::factory()->create(['stock' => 5]);
        $second = Product::factory()->create(['stock' => 5]);
        $this->addItem($user, $first);
        $this->addItem($user, $second);

        Sanctum::actingAs($user);
        $data = $this->deleteJson('/api/cart/items')->assertOk()->json('data');

        $this->assertSame(0, $data['summary']['item_count']);
        $this->assertSame(0, CartItem::query()->count());
    }

    public function test_worker_cannot_use_cart_endpoints(): void
    {
        Sanctum::actingAs(User::factory()->worker()->create());

        $this->getJson('/api/cart')->assertForbidden();
    }

    public function test_unauthenticated_cart_request_is_rejected(): void
    {
        $this->getJson('/api/cart')->assertUnauthorized();
    }

    public function test_cart_is_scoped_to_the_authenticated_user(): void
    {
        $owner = $this->customer();
        $other = $this->customer();
        $product = Product::factory()->create(['stock' => 5]);
        $this->addItem($owner, $product, 2);

        Sanctum::actingAs($other);
        $data = $this->getJson('/api/cart')->assertOk()->json('data');

        $this->assertSame([], $data['items']);
        $this->assertSame(0, $data['summary']['item_count']);
        $this->assertSame(0, CartItem::query()
            ->whereHas('cart', fn ($query) => $query->where('user_id', $other->id))
            ->count());
    }
}
