<?php

namespace Tests\Feature\Security;

use App\Models\ContactMessage;
use App\Models\IdDocument;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * A05/A09 — Security misconfiguration and sensitive data exposure.
 *
 * No secrets or private paths in JSON, JSON-only errors without stack traces,
 * hardened security headers, cookie flags, CORS allow-list and no API-debug
 * endpoint exposure.
 */
class ExposureHeadersTest extends TestCase
{
    use RefreshDatabase, SecurityTestSupport;

    private function assertCleanPayload(string $label, $response): void
    {
        $body = (string) $response->getContent();
        $contentType = (string) $response->headers->get('Content-Type');

        $this->assertStringStartsWith('application/json', $contentType, "{$label} must be JSON, got {$contentType}.");

        foreach (['$2y$', 'argon2id$', 'remember_token', 'storage/app', 'password_confirmation'] as $needle) {
            $this->assertStringNotContainsString($needle, $body, "{$label} leaks '{$needle}'.");
        }

        $this->assertNoStacktrace((array) $response->json());
    }

    public function test_auth_and_profile_responses_never_expose_credentials(): void
    {
        $customer = User::factory()->customer()->create(['password' => 'Login#2026Secure']);

        $login = $this->postJson('/api/auth/login', [
            'login' => $customer->email,
            'password' => 'Login#2026Secure',
        ])->assertOk();
        $this->assertCleanPayload('login', $login);
        $this->assertNoSensitiveKeys($login->json());

        $this->actingAs($customer);
        $me = $this->getJson('/api/auth/me')->assertOk();
        $this->assertCleanPayload('auth/me', $me);
        $this->assertNoSensitiveKeys($me->json());

        $profile = $this->getJson('/api/profile')->assertOk();
        $this->assertCleanPayload('profile', $profile);
        $this->assertNoSensitiveKeys($profile->json());
        $this->assertArrayNotHasKey('path', (array) $profile->json('data'));
        $this->assertSame(['id_front' => false, 'id_back' => false], $profile->json('data.id_documents'));
    }

    public function test_admin_and_worker_lists_never_expose_password_hashes_or_id_paths(): void
    {
        Storage::fake('private');
        $this->asAdmin();
        User::factory()->pending()->create();
        User::factory()->worker()->create();

        $this->assertCleanPayload('admin accounts', $this->getJson('/api/admin/accounts?tab=pending')->assertOk());
        $this->assertCleanPayload('admin workers', $this->getJson('/api/admin/workers')->assertOk());
        $this->assertCleanPayload('admin stores', $this->getJson('/api/admin/stores')->assertOk());
        $this->assertCleanPayload('admin sales', $this->getJson('/api/admin/sales')->assertOk());
        $this->assertCleanPayload('admin contact messages', $this->getJson('/api/admin/contact-messages')->assertOk());

        $this->asWorker();
        $this->assertCleanPayload('worker orders', $this->getJson('/api/worker/orders')->assertOk());
        $this->assertCleanPayload('worker products', $this->getJson('/api/worker/products')->assertOk());
    }

    public function test_customer_and_public_payloads_never_expose_private_paths(): void
    {
        $customer = User::factory()->customer()->create();
        $order = Order::factory()->create(['user_id' => $customer->getKey()]);
        Notification::factory()->create(['user_id' => $customer->getKey()]);
        $product = Product::factory()->create(['is_active' => true]);
        Product::factory()->create(['is_active' => true]);

        $this->assertCleanPayload('products', $this->getJson('/api/products')->assertOk());
        $this->assertCleanPayload('stores', $this->getJson('/api/stores')->assertOk());
        $this->assertCleanPayload('home', $this->getJson('/api/home')->assertOk());
        $this->assertCleanPayload('product detail', $this->getJson('/api/products/'.$product->slug)->assertOk());

        $this->actingAs($customer);
        $this->assertCleanPayload('cart', $this->getJson('/api/cart')->assertOk());
        $this->assertCleanPayload('orders', $this->getJson('/api/orders')->assertOk());
        $this->assertCleanPayload('order detail', $this->getJson('/api/orders/'.$order->getKey())->assertOk());
        $this->assertCleanPayload('notifications', $this->getJson('/api/notifications')->assertOk());
    }

    public function test_error_responses_are_json_without_stack_traces_or_sql_details(): void
    {
        // Production rendering: APP_DEBUG=false (docker-compose.yml, php.ini).
        config(['app.debug' => false]);

        $unknownRoute = $this->getJson('/api/this/does/not/exist');
        $unknownRoute->assertNotFound();
        $this->assertSame(['message' => 'Resource not found.'], $unknownRoute->json());
        $this->assertStringStartsWith('application/json', (string) $unknownRoute->headers->get('Content-Type'));

        $guest = $this->getJson('/api/cart');
        $guest->assertUnauthorized();
        $this->assertSame(['message' => 'Unauthenticated.'], $guest->json());

        $customer = $this->asCustomer();
        $missing = $this->getJson('/api/orders/999999');
        $missing->assertNotFound();
        $this->assertSame(['message' => 'Resource not found.'], $missing->json());

        $validation = $this->postJson('/api/cart/items', ['product_id' => 'not-an-id', 'quantity' => 0]);
        $validation->assertStatus(422);
        $this->assertArrayHasKey('errors', (array) $validation->json());
        $this->assertNoStacktrace((array) $validation->json());
        $this->assertNoSqlError((string) $validation->getContent());

        // Role violation (403) must not echo middleware internals.
        $this->asWorker();
        $forbidden = $this->getJson('/api/admin/accounts?tab=pending');
        $forbidden->assertForbidden();
        $this->assertNoStacktrace((array) $forbidden->json());
        $this->assertStringNotContainsString('EnsureRole', (string) $forbidden->getContent());

        $this->assertSame($customer->id, $customer->fresh()->id);
    }

    public function test_security_headers_are_present_on_api_responses(): void
    {
        $response = $this->getJson('/api/health')->assertOk();

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
        $response->assertHeader('Cache-Control', 'no-store, private');
        $response->assertHeader('Cross-Origin-Opener-Policy', 'same-origin');
        $response->assertHeader('Cross-Origin-Resource-Policy', 'same-origin');
    }

    public function test_health_endpoint_exposes_no_configuration_secrets(): void
    {
        $response = $this->getJson('/api/health')->assertOk();
        $payload = $response->json();

        $this->assertSame(['data'], array_keys($payload));
        $this->assertSame(['status', 'database', 'time', 'app'], array_keys($payload['data']));

        foreach (['key', 'env', 'debug', 'password', 'host', 'connection'] as $field) {
            $this->assertArrayNotHasKey($field, $payload['data']);
        }
    }

    public function test_cors_allowlist_rejects_unknown_origins(): void
    {
        $evil = $this->withHeaders([
            'Origin' => 'https://evil.attacker.test',
            'Accept' => 'application/json',
        ])->getJson('/api/health')->assertOk();

        $this->assertFalse($evil->headers->has('Access-Control-Allow-Origin'), 'Unknown origin must not receive CORS approval.');

        $allowedOrigin = (string) (config('cors.allowed_origins')[0] ?? 'http://localhost');
        $this->assertNotSame('*', $allowedOrigin);

        $allowed = $this->withHeaders([
            'Origin' => $allowedOrigin,
            'Accept' => 'application/json',
        ])->getJson('/api/health')->assertOk();

        $this->assertSame($allowedOrigin, $allowed->headers->get('Access-Control-Allow-Origin'));
        $this->assertSame('true', (string) $allowed->headers->get('Access-Control-Allow-Credentials'));

        // Preflight from an unknown origin must not be approved either.
        $preflight = $this->withHeaders([
            'Origin' => 'https://evil.attacker.test',
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'content-type',
        ])->options('/api/auth/login');

        $this->assertFalse($preflight->headers->has('Access-Control-Allow-Origin'));
    }

    public function test_session_cookies_are_http_only_encrypted_and_same_site_lax(): void
    {
        $this->assertTrue((bool) config('session.encrypt'), 'Session payloads must be encrypted (§3).');
        $this->assertTrue((bool) config('session.http_only'), 'Session cookie must be HttpOnly.');
        $this->assertSame('lax', (string) config('session.same_site'), 'Session cookie must be SameSite=Lax.');
        // Production (docker-compose) uses the database driver; phpunit forces
        // the array driver. Either way the session must not be cookie-based.
        $this->assertContains((string) config('session.driver'), ['database', 'array']);
        $this->assertContains('web', (array) config('sanctum.guard'));

        $response = $this->get('/sanctum/csrf-cookie');
        $this->assertContains($response->getStatusCode(), [200, 204]);

        $sessionCookieName = (string) config('session.cookie');
        $cookies = collect($response->headers->getCookies());
        $sessionCookie = $cookies->firstWhere('name', $sessionCookieName);

        if ($sessionCookie !== null) {
            $this->assertTrue($sessionCookie->isHttpOnly(), 'Session cookie must be HttpOnly.');
            $this->assertSame('lax', strtolower((string) $sessionCookie->getSameSite()));
            $this->assertNotSame('', $sessionCookie->getValue());
        }
    }

    public function test_all_api_success_responses_use_json_content_type(): void
    {
        $customer = User::factory()->customer()->create();
        $order = Order::factory()->create(['user_id' => $customer->getKey()]);
        $product = Product::factory()->create(['is_active' => true]);
        unset($order);

        $public = [
            '/api/health',
            '/api/home',
            '/api/categories',
            '/api/products',
            '/api/products/'.$product->slug,
            '/api/stores',
        ];

        foreach ($public as $uri) {
            $response = $this->getJson($uri);
            $this->assertSame(200, $response->getStatusCode(), "GET {$uri}");
            $this->assertStringStartsWith('application/json', (string) $response->headers->get('Content-Type'), "GET {$uri}");
        }

        $this->actingAs($customer);
        foreach (['/api/cart', '/api/orders', '/api/notifications', '/api/profile', '/api/auth/me'] as $uri) {
            $response = $this->getJson($uri);
            $this->assertSame(200, $response->getStatusCode(), "GET {$uri}");
            $this->assertStringStartsWith('application/json', (string) $response->headers->get('Content-Type'), "GET {$uri}");
        }
    }

    public function test_contact_messages_are_not_publicly_readable(): void
    {
        ContactMessage::create([
            'name' => 'Private Sender',
            'email' => 'private.sender@gaisano-cordova.com',
            'phone' => '09171234567',
            'subject' => 'Private',
            'message' => 'Sensitive message',
            'status' => 'new',
            'ip_address' => '127.0.0.1',
        ]);

        $this->getJson('/api/contact-messages')->assertNotFound();

        $customer = $this->asCustomer();
        $this->getJson('/api/admin/contact-messages')->assertForbidden();

        $this->assertSame($customer->id, auth()->id());
    }

    public function test_id_document_downloads_are_not_cacheable_by_shared_proxies(): void
    {
        Storage::fake('private');
        $owner = User::factory()->customer()->create();
        $path = 'id-documents/'.$owner->getKey().'/'.str()->random(40).'.png';
        Storage::disk('private')->put($path, $this->tinyPngBytes());
        $document = IdDocument::create([
            'user_id' => $owner->getKey(),
            'type' => 'id_front',
            'path' => $path,
            'original_name' => 'front.png',
            'mime' => 'image/png',
            'size_bytes' => 1,
        ]);

        $this->actingAs($owner);
        $response = $this->get('/api/profile/id-documents/'.$document->getKey());

        $response->assertOk();
        $this->assertSame('no-store, private', $response->headers->get('Cache-Control'));
    }
}
