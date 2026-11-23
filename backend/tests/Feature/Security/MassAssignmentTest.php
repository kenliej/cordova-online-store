<?php

namespace Tests\Feature\Security;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\ContactMessage;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * A04 — Mass assignment / privilege escalation.
 *
 * Every write endpoint uses validated whitelists; role, status, account numbers,
 * bad_records, ownership and prices can never be supplied by the client.
 */
class MassAssignmentTest extends TestCase
{
    use RefreshDatabase, SecurityTestSupport;

    public function test_registration_cannot_self_assign_privileged_fields(): void
    {
        Storage::fake('private');
        Storage::fake('public');

        $email = 'escalate.'.uniqid().'@gaisano-cordova.com';
        $this->post('/api/auth/register', array_merge(
            $this->registerPayload(['email' => $email]),
            $this->idDocuments(),
            [
                'role' => 'admin',
                'status' => 'active',
                'bad_records' => 99,
                'customer_no' => '999999999999',
                'worker_no' => '888888888888',
                'store_id' => 1,
                'email_verified_at' => now()->toIso8601String(),
                'id' => 424242,
            ],
        ))->assertCreated();

        $user = User::query()->where('email', $email)->firstOrFail();

        $this->assertSame('customer', $user->role->value);
        $this->assertSame('pending', $user->status->value);
        $this->assertSame(0, $user->bad_records);
        $this->assertNull($user->customer_no);
        $this->assertNull($user->worker_no);
        $this->assertNull($user->store_id);
        $this->assertNull($user->email_verified_at);
        $this->assertNotSame(424242, $user->getKey());
    }

    public function test_profile_update_cannot_escalate_role_or_account_metadata(): void
    {
        $customer = User::factory()->customer()->create([
            'email' => 'cannot.change@gaisano-cordova.com',
            'password' => 'Original#2026Pass',
        ]);
        $originalNo = $customer->customer_no;

        $this->actingAs($customer);
        $this->patchJson('/api/profile', [
            'name' => 'Renamed Customer',
            'role' => 'admin',
            'status' => 'active',
            'bad_records' => 99,
            'customer_no' => '999999999999',
            'worker_no' => '888888888888',
            'store_id' => 1,
            'id' => 1,
            'email' => 'attacker@gaisano-cordova.com',
            'password' => 'Hacked#2026Pass',
            'remember_token' => 'forged',
            'email_verified_at' => now()->toIso8601String(),
        ])->assertOk();

        $customer->refresh();
        $this->assertSame('Renamed Customer', $customer->name);
        $this->assertSame('customer', $customer->role->value);
        $this->assertSame('active', $customer->status->value);
        $this->assertSame(0, $customer->bad_records);
        $this->assertSame($originalNo, $customer->customer_no);
        $this->assertNull($customer->worker_no);
        $this->assertSame('cannot.change@gaisano-cordova.com', $customer->email);
        $this->assertTrue(Hash::check('Original#2026Pass', $customer->password));
    }

    public function test_admin_worker_creation_cannot_create_an_admin(): void
    {
        $this->asAdmin();
        $email = 'worker.escalate.'.uniqid().'@gaisano-cordova.com';

        $response = $this->postJson('/api/admin/workers', [
            'name' => 'Escalation Attempt',
            'email' => $email,
            'phone' => '0917'.random_int(1000000, 9999999),
            'password' => 'Worker#2026Secure',
            'role' => 'admin',
            'status' => 'banned',
            'bad_records' => 99,
            'customer_no' => '111111111111',
            'worker_no' => '222222222222',
        ])->assertCreated();

        $worker = User::query()->where('email', $email)->firstOrFail();

        $this->assertSame('worker', $worker->role->value);
        $this->assertSame('active', $worker->status->value);
        $this->assertSame(0, $worker->bad_records);
        $this->assertNull($worker->customer_no);
        $this->assertMatchesRegularExpression('/^[0-9]{12}$/', (string) $worker->worker_no);
        $this->assertNotSame('222222222222', $worker->worker_no);
        $this->assertNotSame('admin', $response->json('data.role'));
    }

    public function test_admin_worker_update_cannot_escalate_or_change_status(): void
    {
        $worker = User::factory()->worker()->create(['name' => 'Editable Worker']);
        $this->asAdmin();

        $this->patchJson('/api/admin/workers/'.$worker->getKey(), [
            'name' => 'Updated Worker',
            'role' => 'admin',
            'status' => 'banned',
            'bad_records' => 99,
            'customer_no' => '111111111111',
            'worker_no' => '222222222222',
            'email' => 'changed.worker@gaisano-cordova.com',
        ])->assertOk();

        $worker->refresh();
        $this->assertSame('Updated Worker', $worker->name);
        $this->assertSame('worker', $worker->role->value);
        $this->assertSame('active', $worker->status->value);
        $this->assertSame(0, $worker->bad_records);
        $this->assertNull($worker->customer_no);
        $this->assertNotSame('222222222222', $worker->worker_no);
    }

    public function test_checkout_cannot_forge_ownership_totals_or_payment_state(): void
    {
        $customer = User::factory()->customer()->create();
        $other = User::factory()->customer()->create();
        $product = Product::factory()->create(['price' => 250, 'stock' => 10]);
        $cart = Cart::factory()->create(['user_id' => $customer->getKey()]);
        $item = CartItem::create([
            'cart_id' => $cart->getKey(),
            'product_id' => $product->getKey(),
            'quantity' => 2,
            'is_selected' => true,
        ]);

        $this->actingAs($customer);
        $this->postJson('/api/checkout', [
            'item_ids' => [$item->getKey()],
            'user_id' => $other->getKey(),
            'order_number' => 'ATK-000001',
            'status' => 'claimed',
            'payment_status' => 'paid',
            'subtotal' => 0,
            'total' => 0,
            'cancelled_by' => $other->getKey(),
        ])->assertCreated();

        $order = Order::query()->latest('id')->firstOrFail();

        $this->assertSame($customer->getKey(), (int) $order->user_id);
        $this->assertSame('pending', $order->statusValue());
        $this->assertSame('unpaid', $order->payment_status);
        $this->assertEquals(500.0, (float) $order->total);
        $this->assertMatchesRegularExpression('/^OM-\d{4}-\d{6}$/', $order->order_number);
        $this->assertNotSame('ATK-000001', $order->order_number);
        $this->assertNull($order->cancelled_by);
    }

    public function test_cancel_cannot_forge_cancelled_by(): void
    {
        $customer = User::factory()->customer()->create();
        $other = User::factory()->customer()->create();
        $order = Order::factory()->pending()->create(['user_id' => $customer->getKey()]);

        $this->actingAs($customer);
        $this->patchJson('/api/orders/'.$order->getKey().'/cancel', [
            'cancelled_by' => $other->getKey(),
            'status' => 'claimed',
        ])->assertOk();

        $order->refresh();
        $this->assertSame('cancelled', $order->statusValue());
        $this->assertSame($customer->getKey(), (int) $order->cancelled_by);
    }

    public function test_contact_form_cannot_forge_status_or_ip(): void
    {
        $this->postJson('/api/contact', $this->contactPayload([
            'status' => 'replied',
            'ip_address' => '203.0.113.99',
            'user_agent' => 'attacker-controlled',
        ]))->assertCreated();

        $message = ContactMessage::query()->firstOrFail();
        $this->assertSame('new', $message->status);
        $this->assertSame('127.0.0.1', $message->ip_address);
        $this->assertNotSame('attacker-controlled', $message->user_agent);
    }

    public function test_admin_store_creation_ignores_client_slug_and_identifier(): void
    {
        $category = Category::factory()->storeCategory()->create();
        $this->asAdmin();

        $this->postJson('/api/admin/stores', [
            'name' => 'Mass Assignment Store',
            'category_id' => $category->getKey(),
            'phone' => '09171234567',
            'slug' => 'evil-slug',
            'id' => 999999,
            'image_path' => '../../.env',
        ])->assertCreated();

        $store = Store::query()->where('name', 'Mass Assignment Store')->firstOrFail();
        $this->assertSame('mass-assignment-store', $store->slug);
        $this->assertNotSame(999999, $store->getKey());
        $this->assertNotSame('../../.env', $store->image_path);
    }

    public function test_worker_product_creation_forces_created_by_to_the_authenticated_worker(): void
    {
        $admin = User::factory()->admin()->create();
        $worker = $this->asWorker();
        $category = Category::factory()->product()->create();

        $this->postJson('/api/worker/products', [
            'name' => 'Ownership Probe',
            'category_id' => $category->getKey(),
            'price' => 10,
            'stock' => 1,
            'created_by' => $admin->getKey(),
            'slug' => 'attacker-slug',
            'id' => 999999,
        ])->assertCreated();

        $product = Product::query()->where('name', 'Ownership Probe')->firstOrFail();
        $this->assertSame($worker->getKey(), $product->created_by);
        $this->assertNotSame('attacker-slug', $product->slug);
        $this->assertNotSame(999999, $product->getKey());
    }

    public function test_worker_product_image_remove_ids_must_belong_to_the_product(): void
    {
        Storage::fake('public');
        $worker = $this->asWorker();
        $category = Category::factory()->product()->create();
        $product = Product::factory()->create(['created_by' => $worker->getKey()]);
        $foreign = Product::factory()->create();
        $foreignImage = ProductImage::create([
            'product_id' => $foreign->getKey(),
            'path' => 'products/'.str()->random(40).'.png',
            'sort_order' => 0,
        ]);

        $this->patchJson('/api/worker/products/'.$product->getKey(), [
            'name' => 'Rename Attempt',
            'remove_image_ids' => [$foreignImage->getKey()],
        ])->assertStatus(422)->assertJsonValidationErrors('remove_image_ids.0');

        $this->assertNotNull($foreignImage->fresh());
    }

    public function test_admin_cannot_approve_a_non_pending_account_or_forge_account_numbers(): void
    {
        $customer = User::factory()->customer()->create();
        $this->asAdmin();

        $this->postJson('/api/admin/accounts/'.$customer->getKey().'/approve', [
            'customer_no' => '999999999999',
        ])->assertStatus(409)->assertJsonPath('code', 'invalid_account_status');

        $this->assertNotSame('999999999999', $customer->fresh()->customer_no);
    }

    public function test_admin_cannot_ban_or_remove_a_worker_through_customer_removal_rules_of_self(): void
    {
        $admin = $this->asAdmin();

        $this->postJson('/api/admin/accounts/'.$admin->getKey().'/remove')
            ->assertForbidden()
            ->assertJsonPath('code', 'cannot_remove_admin');

        $this->assertSame('active', $admin->fresh()->status->value);
    }
}
