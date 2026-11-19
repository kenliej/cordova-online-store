<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthLoginTest extends TestCase
{
    use InteractsWithUploads, RefreshDatabase;

    public function test_customer_can_login_with_email_and_receives_user_payload(): void
    {
        $user = User::factory()->customer()->create(['password' => 'Secret#2026Pass']);

        $response = $this->stateful()->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'Secret#2026Pass',
            'remember' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonPath('data.role', 'customer')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.customer_no', $user->customer_no)
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.remember_token');

        $this->assertAuthenticatedAs($user);
        $this->assertNotNull($user->refresh()->last_login_at);
    }

    public function test_worker_can_login_with_phone_number(): void
    {
        $worker = User::factory()->worker()->create(['password' => 'Secret#2026Pass']);

        $response = $this->stateful()->postJson('/api/auth/login', [
            'login' => $worker->phone,
            'password' => 'Secret#2026Pass',
        ]);

        $response->assertOk()->assertJsonPath('data.role', 'worker');
        $this->assertAuthenticatedAs($worker);
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        $user = User::factory()->customer()->create(['password' => 'Secret#2026Pass']);

        $response = $this->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('login');
        $this->assertGuest();
    }

    public function test_pending_account_cannot_log_in(): void
    {
        $user = User::factory()->pending()->create(['password' => 'Secret#2026Pass']);

        $response = $this->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'Secret#2026Pass',
        ]);

        $response->assertStatus(403)->assertJsonPath('code', 'account_pending');
        $this->assertGuest();
    }

    public function test_removed_account_cannot_log_in(): void
    {
        $user = User::factory()->removed()->create(['password' => 'Secret#2026Pass']);

        $response = $this->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'Secret#2026Pass',
        ]);

        $response->assertStatus(403)->assertJsonPath('code', 'account_removed');
    }

    public function test_banned_account_cannot_log_in(): void
    {
        $user = User::factory()->banned()->create(['password' => 'Secret#2026Pass']);

        $response = $this->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'Secret#2026Pass',
        ]);

        $response->assertStatus(403)->assertJsonPath('code', 'account_banned');
    }

    public function test_rejected_account_cannot_log_in(): void
    {
        $user = User::factory()->rejected()->create(['password' => 'Secret#2026Pass']);

        $response = $this->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'Secret#2026Pass',
        ]);

        $response->assertStatus(403)->assertJsonPath('code', 'account_rejected');
    }

    public function test_login_is_rate_limited_after_five_attempts(): void
    {
        $user = User::factory()->customer()->create(['password' => 'Secret#2026Pass']);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/auth/login', [
                'login' => $user->email,
                'password' => 'wrong-password',
            ])->assertStatus(422);
        }

        $limited = $this->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'wrong-password',
        ]);

        $limited->assertStatus(429)->assertHeader('Retry-After');
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_me_returns_the_authenticated_user(): void
    {
        $user = User::factory()->admin()->create();

        $response = $this->actingAs($user)->getJson('/api/auth/me');

        $response->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.role', 'admin')
            ->assertJsonMissingPath('data.password');
    }

    public function test_logout_requires_authentication(): void
    {
        $this->postJson('/api/auth/logout')->assertUnauthorized();
    }

    public function test_logout_ends_the_session(): void
    {
        $user = User::factory()->customer()->create();

        $this->actingAs($user)
            ->postJson('/api/auth/logout')
            ->assertNoContent();

        // The auth:sanctum middleware switches the default guard to sanctum for
        // the request, so assert the web (session) guard is logged out.
        $this->assertGuest('web');
        $this->assertNull($this->app['auth']->guard('web')->user());
    }
}
