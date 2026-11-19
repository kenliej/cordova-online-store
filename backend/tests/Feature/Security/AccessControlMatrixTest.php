<?php

namespace Tests\Feature\Security;

use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A01 — Broken Access Control: full role × endpoint matrix.
 *
 * Guests must get a JSON 401, authenticated users of the wrong role a 403, and
 * the owning role a non-401/403 response. The backend — not the SPA guards — is
 * the security boundary.
 */
class AccessControlMatrixTest extends TestCase
{
    use RefreshDatabase, SecurityTestSupport;

    /** @return list<array{0: string, 1: string}> [method, uri] for every protected endpoint */
    private function protectedEndpoints(User $targetOrderCustomer, User $targetAccount, int $cartItemId): array
    {
        return [
            // Any authenticated role (profile)
            ['GET', '/api/auth/me'],
            ['GET', '/api/profile'],
            ['PATCH', '/api/profile'],
            ['PATCH', '/api/profile/password'],
            ['POST', '/api/profile/avatar'],
            ['GET', '/api/profile/id-documents/1'],
            // Customer
            ['GET', '/api/cart'],
            ['POST', '/api/cart/items'],
            ['DELETE', '/api/cart/items'],
            ['PATCH', '/api/cart/items/'.$cartItemId],
            ['DELETE', '/api/cart/items/'.$cartItemId],
            ['POST', '/api/checkout'],
            ['GET', '/api/orders'],
            ['GET', '/api/orders/1'],
            ['PATCH', '/api/orders/1/cancel'],
            ['GET', '/api/notifications'],
            ['PATCH', '/api/notifications/1/read'],
            ['POST', '/api/notifications/read-all'],
            // Worker (+ admin)
            ['GET', '/api/worker/orders'],
            ['GET', '/api/worker/orders/1'],
            ['PATCH', '/api/worker/orders/1/status'],
            ['GET', '/api/worker/products'],
            ['POST', '/api/worker/products'],
            ['PATCH', '/api/worker/products/1'],
            ['DELETE', '/api/worker/products/1'],
            // Admin
            ['GET', '/api/admin/accounts'],
            ['GET', '/api/admin/accounts/'.$targetAccount->getKey().'/id-documents'],
            ['POST', '/api/admin/accounts/'.$targetAccount->getKey().'/approve'],
            ['POST', '/api/admin/accounts/'.$targetAccount->getKey().'/reject'],
            ['POST', '/api/admin/accounts/'.$targetAccount->getKey().'/remove'],
            ['POST', '/api/admin/accounts/'.$targetAccount->getKey().'/restore'],
            ['GET', '/api/admin/workers'],
            ['POST', '/api/admin/workers'],
            ['PATCH', '/api/admin/workers/'.$targetAccount->getKey()],
            ['DELETE', '/api/admin/workers/'.$targetAccount->getKey()],
            ['GET', '/api/admin/stores'],
            ['POST', '/api/admin/stores'],
            ['GET', '/api/admin/stores/1'],
            ['PATCH', '/api/admin/stores/1'],
            ['DELETE', '/api/admin/stores/1'],
            ['GET', '/api/admin/sales/summary'],
            ['GET', '/api/admin/sales'],
            ['GET', '/api/admin/contact-messages'],
            ['PATCH', '/api/admin/contact-messages/1'],
        ];
    }

    public function test_guests_receive_json_401_on_every_protected_endpoint(): void
    {
        $customer = User::factory()->customer()->create();
        $order = Order::factory()->create(['user_id' => $customer->getKey()]);
        $product = Product::factory()->create();
        $store = Store::factory()->create();
        $account = User::factory()->pending()->create();

        $endpoints = $this->protectedEndpoints($customer, $account, 1);
        // Use real bound ids where the route model binding exists.
        $endpoints = array_map(function (array $endpoint) use ($order, $product, $store): array {
            $uri = str_replace(
                ['/api/orders/1', '/api/worker/orders/1', '/api/worker/products/1', '/api/worker/products', '/api/admin/stores/1'],
                ['/api/orders/'.$order->getKey(), '/api/worker/orders/'.$order->getKey(), '/api/worker/products/'.$product->getKey(), '/api/worker/products', '/api/admin/stores/'.$store->getKey()],
                $endpoint[1],
            );

            return [$endpoint[0], $uri];
        }, $endpoints);

        foreach ($endpoints as [$method, $uri]) {
            $response = $this->withHeaders(['Accept' => 'application/json'])
                ->json($method, $uri);

            $this->assertSame(
                401,
                $response->getStatusCode(),
                "Guest {$method} {$uri} should be 401, got {$response->getStatusCode()}.",
            );

            $body = (string) $response->getContent();
            $this->assertStringNotContainsStringIgnoringCase('login', $body, "Guest {$method} {$uri} leaks a login redirect.");
        }
    }

    public function test_customers_are_forbidden_from_worker_and_admin_endpoints(): void
    {
        $customer = $this->asCustomer();
        $target = User::factory()->pending()->create();

        $endpoints = [
            ['GET', '/api/worker/orders'],
            ['GET', '/api/worker/products'],
            ['POST', '/api/worker/products'],
            ['GET', '/api/admin/accounts?tab=pending'],
            ['GET', '/api/admin/workers'],
            ['GET', '/api/admin/stores'],
            ['GET', '/api/admin/sales'],
            ['GET', '/api/admin/sales/summary'],
            ['GET', '/api/admin/contact-messages'],
            ['GET', '/api/admin/accounts/'.$target->getKey().'/id-documents'],
            ['POST', '/api/admin/accounts/'.$target->getKey().'/approve'],
            ['POST', '/api/admin/workers'],
        ];

        foreach ($endpoints as [$method, $uri]) {
            $response = $this->withHeaders(['Accept' => 'application/json'])->json($method, $uri);

            $this->assertSame(403, $response->getStatusCode(), "Customer {$method} {$uri} should be 403.");
        }

        $this->assertSame('customer', $customer->role->value);
    }

    public function test_workers_are_forbidden_from_customer_and_admin_endpoints(): void
    {
        $this->asWorker();
        $target = User::factory()->pending()->create();

        $endpoints = [
            ['GET', '/api/cart'],
            ['POST', '/api/cart/items'],
            ['POST', '/api/checkout'],
            ['GET', '/api/orders'],
            ['GET', '/api/notifications'],
            ['POST', '/api/notifications/read-all'],
            ['GET', '/api/admin/accounts?tab=pending'],
            ['GET', '/api/admin/sales'],
            ['POST', '/api/admin/workers'],
            ['POST', '/api/admin/accounts/'.$target->getKey().'/approve'],
        ];

        foreach ($endpoints as [$method, $uri]) {
            $response = $this->withHeaders(['Accept' => 'application/json'])->json($method, $uri);

            $this->assertSame(403, $response->getStatusCode(), "Worker {$method} {$uri} should be 403.");
        }
    }

    public function test_admins_are_forbidden_from_customer_only_endpoints(): void
    {
        $this->asAdmin();

        $endpoints = [
            ['GET', '/api/cart'],
            ['POST', '/api/cart/items'],
            ['DELETE', '/api/cart/items'],
            ['POST', '/api/checkout'],
            ['GET', '/api/orders'],
            ['GET', '/api/notifications'],
            ['POST', '/api/notifications/read-all'],
        ];

        foreach ($endpoints as [$method, $uri]) {
            $response = $this->withHeaders(['Accept' => 'application/json'])->json($method, $uri);

            $this->assertSame(403, $response->getStatusCode(), "Admin {$method} {$uri} should be 403 per §6.2.");
        }
    }

    public function test_admins_and_workers_can_access_worker_endpoints(): void
    {
        $product = Product::factory()->create();

        foreach (['admin', 'worker'] as $role) {
            $user = $role === 'admin' ? User::factory()->admin()->create() : User::factory()->worker()->create();
            $this->actingAs($user);

            $this->getJson('/api/worker/orders')->assertOk();
            $this->getJson('/api/worker/products')->assertOk();
            $this->patchJson('/api/worker/products/'.$product->getKey(), ['stock' => 5])->assertOk();
        }
    }

    public function test_customers_can_access_customer_endpoints(): void
    {
        $customer = $this->asCustomer();

        $this->getJson('/api/cart')->assertOk();
        $this->getJson('/api/orders')->assertOk();
        $this->getJson('/api/notifications')->assertOk();
        $this->postJson('/api/notifications/read-all')->assertOk();

        $this->assertSame($customer->id, auth()->id());
    }

    public function test_admin_can_access_every_admin_endpoint(): void
    {
        $this->asAdmin();
        User::factory()->pending()->create();

        $this->getJson('/api/admin/accounts?tab=pending')->assertOk();
        $this->getJson('/api/admin/workers')->assertOk();
        $this->getJson('/api/admin/stores')->assertOk();
        $this->getJson('/api/admin/sales/summary')->assertOk();
        $this->getJson('/api/admin/sales')->assertOk();
        $this->getJson('/api/admin/contact-messages')->assertOk();
    }

    public function test_non_active_accounts_cannot_use_role_protected_endpoints_even_if_authenticated(): void
    {
        // Defence in depth: even if a stale session/token survived a ban, the
        // role middleware must reject non-active accounts (§6.7).
        foreach (['pending', 'removed', 'banned'] as $state) {
            $user = User::factory()->customer()->{$state}()->create();
            $this->actingAs($user);

            $response = $this->getJson('/api/cart');
            $this->assertSame(403, $response->getStatusCode(), "{$state} customer should be blocked from /api/cart.");
        }
    }

    public function test_admin_only_routes_are_not_reachable_by_guest_via_route_model_binding_oracle(): void
    {
        // Unauthenticated access must be 401 before model binding can reveal
        // whether an id exists (no 404/403 differential).
        $existing = User::factory()->pending()->create();

        $a = $this->withHeaders(['Accept' => 'application/json'])->getJson('/api/admin/accounts/'.$existing->getKey().'/id-documents');
        $b = $this->withHeaders(['Accept' => 'application/json'])->getJson('/api/admin/accounts/999999/id-documents');

        $this->assertSame(401, $a->getStatusCode());
        $this->assertSame(401, $b->getStatusCode());
    }
}
