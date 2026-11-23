<?php

namespace Tests\Feature\Security;

use App\Models\Category;
use App\Models\Notification;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * A03 — Injection (SQLi / XSS).
 *
 * All filters are parameter-bound and sort/status fields are whitelisted; user
 * content is only ever returned as JSON (never as reflected HTML or SQL errors).
 */
class InjectionXssTest extends TestCase
{
    use RefreshDatabase, SecurityTestSupport;

    /** @return array<int, string> */
    private function payloads(): array
    {
        return [
            "' OR 1=1 --",
            '" OR "1"="1',
            "'; DROP TABLE users; --",
            '%27%20OR%201%3D1--',
            '1 UNION SELECT password FROM users --',
            "\\' OR 1=1 #",
            '<script>alert(1)</script>',
            '<img src=x onerror=alert(1)>',
        ];
    }

    public function test_sql_injection_payloads_are_safe_in_public_search_and_filters(): void
    {
        Product::factory()->count(3)->create(['is_active' => true]);
        Category::factory()->product()->create();

        foreach ($this->payloads() as $payload) {
            $products = $this->getJson('/api/products?search='.urlencode($payload).'&per_page=10');
            $products->assertOk();
            $this->assertNoSqlError((string) $products->getContent());
            $this->assertStringStartsWith('application/json', (string) $products->headers->get('Content-Type'));

            $byCategory = $this->getJson('/api/products?category='.urlencode($payload));
            $byCategory->assertOk();
            $this->assertNoSqlError((string) $byCategory->getContent());

            $stores = $this->getJson('/api/stores?search='.urlencode($payload));
            $stores->assertOk();
            $this->assertNoSqlError((string) $stores->getContent());
        }

        // Database is intact and still queryable after the attack burst.
        $this->assertSame(3, Product::query()->count());
        $this->assertDatabaseCount('users', 0);
        $this->assertNotFalse(DB::select('SELECT 1'));
    }

    public function test_sort_and_status_filters_are_whitelisted(): void
    {
        Product::factory()->create();
        $customer = $this->asCustomer();

        foreach (['price desc', 'id DESC', 'price_asc; DROP TABLE products', 'price_asc,id'] as $sort) {
            $this->getJson('/api/products?sort='.urlencode($sort))
                ->assertStatus(422)
                ->assertJsonValidationErrors('sort');
        }

        // Worker/admin order filters: status must be whitelisted.
        $this->getJson('/api/orders?status='.urlencode("' OR 1=1 --"))
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');

        $this->asWorker();
        $this->getJson('/api/worker/orders?status='.urlencode('claimed; DROP TABLE orders'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
        $this->getJson('/api/worker/orders?status='.urlencode("' OR '1'='1"))
            ->assertStatus(422);

        $this->asAdmin();
        $this->getJson('/api/admin/contact-messages?status='.urlencode("' OR 1=1 --"))
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
        $this->getJson('/api/admin/sales?date='.urlencode("2026-01-01' OR 1=1 --"))
            ->assertStatus(422)
            ->assertJsonValidationErrors('date');

        $this->assertSame($customer->id, $customer->fresh()->id);
        $this->assertSame(1, Product::query()->count());
    }

    public function test_sort_ascending_is_actually_applied_after_whitelisting(): void
    {
        $cheap = Product::factory()->create(['price' => 5, 'is_active' => true]);
        $expensive = Product::factory()->create(['price' => 500, 'is_active' => true]);

        $response = $this->getJson('/api/products?sort=price_asc&per_page=50')->assertOk();
        $prices = collect($response->json('data'))->pluck('price')->map(fn ($price) => (float) $price)->values()->all();

        $this->assertSame([(float) $cheap->id, (float) $expensive->id], [
            (float) collect($response->json('data'))->firstWhere('price', $prices[0])['id'],
            (float) collect($response->json('data'))->firstWhere('price', end($prices))['id'],
        ]);
        $sorted = $prices;
        sort($sorted);
        $this->assertSame($sorted, $prices);
    }

    public function test_sql_injection_in_login_does_not_authenticate(): void
    {
        User::factory()->create(['email' => 'sqli.target@gaisano-cordova.com']);
        $this->assertGuest();

        foreach (["' OR '1'='1' --", "admin@gaisano-cordova.com' --", "' UNION SELECT 1,2,3 --"] as $payload) {
            $response = $this->postJson('/api/auth/login', [
                'login' => $payload,
                'password' => $payload,
            ]);

            $this->assertContains($response->getStatusCode(), [422]);
            $this->assertGuest();
            $this->assertNoSqlError((string) $response->getContent());
        }
    }

    public function test_xss_payload_stored_via_contact_form_is_returned_only_as_json(): void
    {
        $xss = '<script>alert("stored-xss")</script><img src=x onerror=alert(1)>';

        $created = $this->postJson('/api/contact', $this->contactPayload([
            'name' => 'XSS Probe',
            'subject' => 'XSS',
            'message' => $xss,
        ]));
        $created->assertCreated();
        $this->assertStringStartsWith('application/json', (string) $created->headers->get('Content-Type'));

        $this->asAdmin();
        $list = $this->getJson('/api/admin/contact-messages')->assertOk();
        $this->assertStringStartsWith('application/json', (string) $list->headers->get('Content-Type'));
        $this->assertStringNotContainsString('<html', (string) $list->getContent());

        $stored = collect($list->json('data'))->first();
        $this->assertSame($xss, $stored['message']);
    }

    public function test_xss_payload_in_product_name_is_json_encoded_for_the_frontend(): void
    {
        $worker = $this->asWorker();
        $category = Category::factory()->product()->create();
        $xss = '<script>alert("product")</script>';

        $create = $this->postJson('/api/worker/products', [
            'name' => $xss,
            'category_id' => $category->getKey(),
            'price' => 10,
            'stock' => 5,
        ]);
        $create->assertCreated();

        $product = Product::query()->latest('id')->firstOrFail();
        $this->assertSame($xss, $product->name);

        $public = $this->getJson('/api/products?per_page=10')->assertOk();
        $this->assertStringStartsWith('application/json', (string) $public->headers->get('Content-Type'));
        $this->assertStringNotContainsString('text/html', (string) $public->headers->get('Content-Type'));

        $detail = $this->getJson('/api/products/'.$product->slug)->assertOk();
        $this->assertStringStartsWith('application/json', (string) $detail->headers->get('Content-Type'));

        // The worker itself is authenticated; the payload never leaked a PHP
        // execution path (JSON only).
        $this->assertSame($worker->id, $product->created_by);
    }

    public function test_xss_payload_in_registration_is_escaped_by_the_json_contract(): void
    {
        Storage::fake('private');

        $xss = '<img src=x onerror=alert(1)>';
        $this->post('/api/auth/register', array_merge(
            $this->registerPayload(['name' => $xss, 'email' => 'xss.'.uniqid().'@gaisano-cordova.com']),
            $this->idDocuments(),
        ))->assertCreated();

        $this->asAdmin();
        $list = $this->getJson('/api/admin/accounts?tab=pending')->assertOk();
        $this->assertStringStartsWith('application/json', (string) $list->headers->get('Content-Type'));
        $this->assertStringNotContainsString('<html', (string) $list->getContent());
        $this->assertSame($xss, collect($list->json('data'))->first()['name']);
    }

    public function test_notification_search_is_parameterized_and_scoped(): void
    {
        $customer = User::factory()->customer()->create();
        $other = User::factory()->customer()->create();
        Notification::factory()->create([
            'user_id' => $customer->getKey(),
            'title' => 'Visible notification',
            'body' => 'hello',
        ]);
        Notification::factory()->create([
            'user_id' => $other->getKey(),
            'title' => 'Foreign notification',
            'body' => 'secret',
        ]);

        $this->actingAs($customer);

        foreach ($this->payloads() as $payload) {
            $response = $this->getJson('/api/notifications?search='.urlencode($payload));
            $response->assertOk();
            $this->assertNoSqlError((string) $response->getContent());
        }

        $wildcard = $this->getJson('/api/notifications?search=%25')->assertOk();
        $titles = collect($wildcard->json('data'))->pluck('title')->all();
        $this->assertContains('Visible notification', $titles);
        $this->assertNotContains('Foreign notification', $titles);
    }

    public function test_no_sql_errors_are_returned_for_malformed_query_values(): void
    {
        $customer = $this->asCustomer();

        $cases = [
            '/api/orders?status[]=x',
            '/api/products?per_page=abc',
            '/api/products?page[]=1',
            '/api/notifications?category[]=x',
        ];

        foreach ($cases as $uri) {
            $response = $this->getJson($uri);
            $this->assertContains($response->getStatusCode(), [200, 422]);
            $this->assertNoSqlError((string) $response->getContent());
        }

        $this->assertSame($customer->id, auth()->id());
    }
}
