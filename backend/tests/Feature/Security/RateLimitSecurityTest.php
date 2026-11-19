<?php

namespace Tests\Feature\Security;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * A04/A07 — Rate limiting and brute-force protection.
 *
 * Login 5/min, register 10/h, forgot-password 5/min, contact 3/h
 * and the general API ceiling of 120/min (spec §6.12).
 */
class RateLimitSecurityTest extends TestCase
{
    use RefreshDatabase, SecurityTestSupport;

    private function assertThrottled($response, string $label): void
    {
        $this->assertSame(429, $response->getStatusCode(), "{$label} was not throttled.");
        $retryAfter = $response->headers->get('Retry-After');
        $this->assertNotNull($retryAfter, "{$label} 429 response is missing Retry-After.");
        $this->assertGreaterThanOrEqual(1, (int) $retryAfter);
        $this->assertLessThanOrEqual(3600, (int) $retryAfter, 'Retry-After must be sane (<= 1 hour).');
        $this->assertStringStartsWith('application/json', (string) $response->headers->get('Content-Type'));
    }

    public function test_login_brute_force_is_limited_after_five_attempts_per_minute(): void
    {
        $user = User::factory()->create(['password' => 'Login#2026Secure']);

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/auth/login', [
                'login' => $user->email,
                'password' => 'Wrong#2026Secure',
            ])->assertStatus(422);
        }

        $this->assertThrottled($this->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'Wrong#2026Secure',
        ]), 'Login');

        // The account itself is not locked out for a different source identifier,
        // but the correct password is still blocked once the limiter trips.
        $this->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'Login#2026Secure',
        ])->assertStatus(429);
    }

    public function test_successful_logins_expose_rate_limit_headers(): void
    {
        $user = User::factory()->create(['password' => 'Login#2026Secure']);

        $response = $this->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'Login#2026Secure',
        ])->assertOk();

        $this->assertSame('5', $response->headers->get('X-RateLimit-Limit'));
        $this->assertSame('4', $response->headers->get('X-RateLimit-Remaining'));
    }

    public function test_forgot_password_is_limited_to_five_requests_per_minute(): void
    {
        $email = 'bruteforce.'.uniqid().'@onlinemall.test';

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/auth/forgot-password', ['email' => $email])->assertOk();
        }

        $this->assertThrottled(
            $this->postJson('/api/auth/forgot-password', ['email' => $email]),
            'Forgot-password',
        );
    }

    public function test_contact_form_is_limited_to_three_requests_per_hour(): void
    {
        for ($attempt = 1; $attempt <= 3; $attempt++) {
            $this->postJson('/api/contact', $this->contactPayload([
                'email' => 'contact.'.$attempt.'.'.uniqid().'@onlinemall.test',
            ]))->assertCreated();
        }

        $this->assertThrottled(
            $this->postJson('/api/contact', $this->contactPayload([
                'email' => 'contact.blocked.'.uniqid().'@onlinemall.test',
            ])),
            'Contact form',
        );

        // Honeypot spammers also count against (and are blocked by) the throttle.
        $this->assertDatabaseCount('contact_messages', 3);
    }

    public function test_registration_is_limited_to_ten_requests_per_hour(): void
    {
        Storage::fake('private');
        Storage::fake('public');

        for ($attempt = 1; $attempt <= 10; $attempt++) {
            $registered = $this->post('/api/auth/register', array_merge(
                $this->registerPayload([
                    'email' => 'ratelimit.'.$attempt.'.'.uniqid().'@onlinemall.test',
                ]),
                $this->idDocuments(),
            ));

            $registered->assertCreated();
        }

        $blocked = $this->post('/api/auth/register', array_merge(
            $this->registerPayload(['email' => 'ratelimit.blocked.'.uniqid().'@onlinemall.test']),
            $this->idDocuments(),
        ));

        $this->assertThrottled($blocked, 'Registration');
        $this->assertSame(10, User::query()->count());
    }

    public function test_checkout_is_limited_to_thirty_requests_per_minute_per_customer(): void
    {
        $customer = $this->asCustomer();
        $product = Product::factory()->create(['stock' => 10]);
        unset($product);

        // Empty cart checkout returns 409 but still counts against the throttle.
        for ($attempt = 1; $attempt <= 30; $attempt++) {
            $response = $this->postJson('/api/checkout', []);
            $this->assertContains($response->getStatusCode(), [409], 'Checkout attempt '.$attempt.' should be a domain error before the limit.');
        }

        $this->assertThrottled($this->postJson('/api/checkout', []), 'Checkout');

        $this->assertSame($customer->id, auth()->id());
    }

    public function test_general_api_ceiling_throttles_after_120_requests_per_minute(): void
    {
        $codes = [];

        for ($attempt = 1; $attempt <= 125; $attempt++) {
            $codes[] = $this->getJson('/api/health')->getStatusCode();
        }

        $allowed = array_filter($codes, fn (int $code) => $code === 200);
        $throttled = array_filter($codes, fn (int $code) => $code === 429);

        $this->assertSame(120, count($allowed), 'The general API limiter must allow 120 requests/minute (§6.12).');
        $this->assertGreaterThanOrEqual(5, count($throttled), 'Requests beyond 120/min must be throttled.');

        $last = $this->getJson('/api/health');
        $this->assertThrottled($last, 'General API');
        $this->assertSame('120', $last->headers->get('X-RateLimit-Limit'));
    }
}
