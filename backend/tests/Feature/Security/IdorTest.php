<?php

namespace Tests\Feature\Security;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\IdDocument;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * A01 — Insecure Direct Object References (IDOR).
 *
 * Cross-user access must resolve to 404 (never 403/200) to avoid resource
 * enumeration, per spec §6.1. Admin-only ID document access must stay admin-only.
 */
class IdorTest extends TestCase
{
    use RefreshDatabase, SecurityTestSupport;

    private function customerWithCartItem(Product $product, int $quantity = 1): array
    {
        $customer = User::factory()->customer()->create();
        $cart = Cart::factory()->create(['user_id' => $customer->getKey()]);
        $item = CartItem::create([
            'cart_id' => $cart->getKey(),
            'product_id' => $product->getKey(),
            'quantity' => $quantity,
            'is_selected' => true,
        ]);

        return [$customer, $item];
    }

    private function idDocumentFor(User $owner, string $type = 'id_front'): IdDocument
    {
        $path = 'id-documents/'.$owner->getKey().'/'.str()->random(40).'.png';
        Storage::disk('private')->put($path, $this->tinyPngBytes());

        return IdDocument::create([
            'user_id' => $owner->getKey(),
            'type' => $type,
            'path' => $path,
            'original_name' => 'front.png',
            'mime' => 'image/png',
            'size_bytes' => strlen($this->tinyPngBytes()),
        ]);
    }

    public function test_customer_cannot_read_another_customers_order(): void
    {
        Storage::fake('private');
        $owner = User::factory()->customer()->create();
        $other = User::factory()->customer()->create();
        $order = Order::factory()->create(['user_id' => $owner->getKey()]);

        $this->actingAs($other);
        $this->getJson('/api/orders/'.$order->getKey())->assertNotFound();
    }

    public function test_customer_cannot_cancel_another_customers_order(): void
    {
        Storage::fake('private');
        $owner = User::factory()->customer()->create();
        $other = User::factory()->customer()->create();
        $order = Order::factory()->pending()->create(['user_id' => $owner->getKey()]);

        $this->actingAs($other);
        $this->patchJson('/api/orders/'.$order->getKey().'/cancel')->assertNotFound();

        $this->assertSame('pending', $order->fresh()->statusValue());
    }

    public function test_customer_order_list_contains_only_own_orders(): void
    {
        $owner = User::factory()->customer()->create();
        $other = User::factory()->customer()->create();
        $ownOrder = Order::factory()->create(['user_id' => $owner->getKey()]);
        $foreignOrder = Order::factory()->create(['user_id' => $other->getKey()]);

        $this->actingAs($owner);
        $response = $this->getJson('/api/orders')->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($ownOrder->getKey(), $ids);
        $this->assertNotContains($foreignOrder->getKey(), $ids);
    }

    public function test_customer_cannot_mutate_or_delete_another_customers_cart_item(): void
    {
        $product = Product::factory()->create(['stock' => 10]);
        [, $item] = $this->customerWithCartItem($product);
        $attacker = User::factory()->customer()->create();

        $this->actingAs($attacker);
        $this->patchJson('/api/cart/items/'.$item->getKey(), ['quantity' => 9])->assertNotFound();
        $this->deleteJson('/api/cart/items/'.$item->getKey())->assertNotFound();

        $this->assertSame(1, (int) $item->fresh()->quantity);
    }

    public function test_customer_cannot_checkout_another_customers_cart_items(): void
    {
        $product = Product::factory()->create(['stock' => 10, 'price' => 100]);
        [$owner, $item] = $this->customerWithCartItem($product, 1);
        $attacker = User::factory()->customer()->create();

        $this->actingAs($attacker);
        $response = $this->postJson('/api/checkout', ['item_ids' => [$item->getKey()]]);

        $response->assertStatus(409)->assertJsonPath('code', 'cart_item_invalid');
        $this->assertDatabaseCount('orders', 0);
        $this->assertSame(10, $product->fresh()->stock);
        $this->assertNotNull($item->fresh());
    }

    public function test_customer_cannot_read_or_mark_another_customers_notification(): void
    {
        $owner = User::factory()->customer()->create();
        $other = User::factory()->customer()->create();
        $foreign = Notification::factory()->create(['user_id' => $owner->getKey()]);

        $this->actingAs($other);

        $list = $this->getJson('/api/notifications')->assertOk();
        $ids = collect($list->json('data'))->pluck('id')->all();
        $this->assertNotContains($foreign->getKey(), $ids);

        $this->patchJson('/api/notifications/'.$foreign->getKey().'/read')->assertNotFound();
        $this->assertNull($foreign->fresh()->read_at);
    }

    public function test_customer_cannot_download_another_customers_private_id_document(): void
    {
        Storage::fake('private');
        $owner = User::factory()->customer()->create();
        $document = $this->idDocumentFor($owner);
        $attacker = User::factory()->customer()->create();

        $this->actingAs($attacker);
        $this->get('/api/profile/id-documents/'.$document->getKey())->assertNotFound();
    }

    public function test_worker_cannot_download_customer_id_documents(): void
    {
        Storage::fake('private');
        $owner = User::factory()->customer()->create();
        $document = $this->idDocumentFor($owner);

        $this->asWorker();
        $this->get('/api/profile/id-documents/'.$document->getKey())->assertNotFound();
    }

    public function test_owner_and_admin_can_download_the_id_document(): void
    {
        Storage::fake('private');
        $owner = User::factory()->customer()->create();
        $document = $this->idDocumentFor($owner);

        $this->actingAs($owner);
        $this->get('/api/profile/id-documents/'.$document->getKey())
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertHeader('Cache-Control', 'no-store, private');

        $this->asAdmin();
        $this->get('/api/profile/id-documents/'.$document->getKey())->assertOk();
    }

    public function test_id_document_download_requires_authentication(): void
    {
        Storage::fake('private');
        $owner = User::factory()->customer()->create();
        $document = $this->idDocumentFor($owner);

        $this->getJson('/api/profile/id-documents/'.$document->getKey())->assertUnauthorized();
    }

    public function test_customer_cannot_use_admin_id_document_endpoint(): void
    {
        Storage::fake('private');
        $owner = User::factory()->customer()->create();
        $this->idDocumentFor($owner);

        $this->asCustomer();
        $this->getJson('/api/admin/accounts/'.$owner->getKey().'/id-documents')->assertForbidden();
    }

    public function test_admin_id_document_endpoint_does_not_expose_private_storage_paths(): void
    {
        Storage::fake('private');
        $owner = User::factory()->pending()->create(['role' => 'customer']);
        $document = $this->idDocumentFor($owner);

        $this->asAdmin();
        $response = $this->getJson('/api/admin/accounts/'.$owner->getKey().'/id-documents')->assertOk();

        $this->assertStringNotContainsString($document->path, (string) $response->getContent());
        $this->assertStringNotContainsString('storage/app', (string) $response->getContent());
    }

    public function test_worker_cannot_use_customer_cart_or_order_endpoints(): void
    {
        $product = Product::factory()->create();
        $this->asWorker();

        $this->getJson('/api/cart')->assertForbidden();
        $this->postJson('/api/cart/items', ['product_id' => $product->getKey(), 'quantity' => 1])->assertForbidden();
        $this->getJson('/api/orders')->assertForbidden();
        $this->getJson('/api/notifications')->assertForbidden();
    }

    public function test_other_users_cart_and_documents_are_not_reachable_through_guessing_ids(): void
    {
        // Send a burst of foreign ids: all must be 404, proving no 403/200 oracle.
        Storage::fake('private');
        $owner = User::factory()->customer()->create();
        $this->idDocumentFor($owner);
        $document = IdDocument::query()->firstOrFail();

        $attacker = User::factory()->customer()->create();
        $this->actingAs($attacker);

        foreach ([1, 2, 3, 999999] as $id) {
            $this->getJson('/api/profile/id-documents/'.$id)->assertNotFound();
        }

        $this->assertSame($owner->getKey(), $document->user_id);
        $this->assertSame(1, IdDocument::query()->count());
    }

    public function test_order_route_binding_404s_do_not_leak_model_class_names(): void
    {
        $customer = $this->asCustomer();

        $response = $this->getJson('/api/orders/999999');
        $response->assertNotFound();
        $this->assertSame(['message' => 'Resource not found.'], $response->json());
        $this->assertSame($customer->id, auth()->id());
    }

    public function test_admin_can_view_any_order_through_worker_route_but_customer_route_is_role_blocked(): void
    {
        $owner = User::factory()->customer()->create();
        $order = Order::factory()->create(['user_id' => $owner->getKey()]);

        $this->asAdmin();
        $this->getJson('/api/worker/orders/'.$order->getKey())->assertOk();
        $this->getJson('/api/orders/'.$order->getKey())->assertForbidden();
    }

    public function test_auth_me_only_returns_the_authenticated_user(): void
    {
        $customer = User::factory()->customer()->create();
        $other = User::factory()->customer()->create();

        $this->actingAs($customer);
        $response = $this->getJson('/api/auth/me')->assertOk();

        $this->assertSame($customer->getKey(), $response->json('data.id'));
        $this->assertNotSame($other->getKey(), $response->json('data.id'));
    }

    public function test_uploaded_avatar_is_attached_to_the_authenticated_account_only(): void
    {
        Storage::fake('public');
        $me = User::factory()->customer()->create();
        $other = User::factory()->customer()->create();

        $this->actingAs($me);
        $this->post('/api/profile/avatar', ['avatar' => UploadedFile::fake()->createWithContent('avatar.png', $this->tinyPngBytes())])
            ->assertOk();

        $this->assertNotNull($me->fresh()->profile_photo_path);
        $this->assertNull($other->fresh()->profile_photo_path);
    }
}
