<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

/**
 * Bearer-token authentication used by the split deployment
 * (React SPA on Vercel -> Laravel API on cPanel).
 */
class TokenAuthTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'CorrectHorse#2026';

    private function activeCustomer(array $attributes = []): User
    {
        return User::factory()->customer()->create(array_merge([
            'email' => 'token.customer@example.test',
            'password' => self::PASSWORD,
        ], $attributes));
    }

    public function test_token_login_returns_a_bearer_token_and_user(): void
    {
        $user = $this->activeCustomer();

        $response = $this->postJson('/api/auth/token', [
            'login' => $user->email,
            'password' => self::PASSWORD,
            'remember' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.token_type', 'Bearer')
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('data.user.role', 'customer')
            ->assertJsonStructure(['data' => ['token', 'token_type', 'expires_at', 'abilities', 'user']]);

        $token = $response->json('data.token');
        $this->assertIsString($token);
        $this->assertStringContainsString('|', $token);

        // The plain-text token is never stored; Sanctum keeps only a hash.
        $stored = PersonalAccessToken::query()->firstOrFail();
        $this->assertNotSame($token, $stored->token);
        $this->assertSame('role:customer', $stored->abilities[0]);
    }

    public function test_bearer_token_authenticates_protected_endpoints(): void
    {
        $user = $this->activeCustomer();
        $token = $this->postJson('/api/auth/token', [
            'login' => $user->email,
            'password' => self::PASSWORD,
        ])->json('data.token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/orders')
            ->assertOk();
    }

    public function test_customer_token_cannot_reach_admin_or_worker_endpoints(): void
    {
        $user = $this->activeCustomer();
        $token = $this->postJson('/api/auth/token', [
            'login' => $user->email,
            'password' => self::PASSWORD,
        ])->json('data.token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/accounts')
            ->assertForbidden();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/worker/orders')
            ->assertForbidden();
    }

    public function test_logout_revokes_the_bearer_token(): void
    {
        $user = $this->activeCustomer();
        $token = $this->postJson('/api/auth/token', [
            'login' => $user->email,
            'password' => self::PASSWORD,
        ])->json('data.token');

        $this->assertSame(1, PersonalAccessToken::query()->count());

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/logout')
            ->assertNoContent();

        $this->assertSame(0, PersonalAccessToken::query()->count());

        // The test HTTP client keeps auth guards between calls in one test;
        // reset them so the revoked token is genuinely re-validated.
        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me')
            ->assertUnauthorized();
    }

    public function test_inactive_accounts_cannot_obtain_tokens(): void
    {
        $cases = [
            'pending' => ['account_pending', User::factory()->pending()->create(['password' => self::PASSWORD])],
            'rejected' => ['account_rejected', User::factory()->rejected()->create(['password' => self::PASSWORD])],
            'removed' => ['account_removed', User::factory()->removed()->create(['password' => self::PASSWORD])],
            'banned' => ['account_banned', User::factory()->banned()->create(['password' => self::PASSWORD])],
        ];

        foreach ($cases as $state => [$expectedCode, $user]) {
            $this->postJson('/api/auth/token', [
                'login' => $user->email,
                'password' => self::PASSWORD,
            ])->assertForbidden()->assertJsonPath('code', $expectedCode);

            $this->assertSame(0, PersonalAccessToken::query()->count(), "{$state} account must not get a token");
        }
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        $user = $this->activeCustomer();

        $this->postJson('/api/auth/token', [
            'login' => $user->email,
            'password' => 'WrongPassword#1',
        ])->assertStatus(422)->assertJsonValidationErrors('login');

        $this->assertSame(0, PersonalAccessToken::query()->count());
    }

    public function test_token_expiry_follows_the_sanctum_configuration(): void
    {
        $user = $this->activeCustomer();
        $login = fn () => $this->postJson('/api/auth/token', [
            'login' => $user->email,
            'password' => self::PASSWORD,
        ]);

        config(['sanctum.expiration' => 60]);
        $response = $login()->assertOk();
        $this->assertNotNull($response->json('data.expires_at'));
        $this->assertNotNull(PersonalAccessToken::query()->firstOrFail()->expires_at);

        DB::table('personal_access_tokens')->delete();

        config(['sanctum.expiration' => null]);
        $this->assertNull($login()->assertOk()->json('data.expires_at'));
        $this->assertNull(PersonalAccessToken::query()->firstOrFail()->expires_at);
    }

    public function test_banning_a_user_revokes_their_tokens(): void
    {
        $admin = User::factory()->admin()->create();
        $user = $this->activeCustomer();

        $token = $this->postJson('/api/auth/token', [
            'login' => $user->email,
            'password' => self::PASSWORD,
        ])->json('data.token');

        $this->actingAs($admin)
            ->postJson("/api/admin/accounts/{$user->id}/remove")
            ->assertOk();

        $this->assertSame(0, PersonalAccessToken::query()->count());

        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me')
            ->assertUnauthorized();
    }

    public function test_login_by_phone_works_for_tokens(): void
    {
        $user = $this->activeCustomer(['phone' => '09171234567']);

        $response = $this->postJson('/api/auth/token', [
            'login' => '09171234567',
            'password' => self::PASSWORD,
        ]);

        $response->assertOk()->assertJsonPath('data.user.id', $user->id);
    }
}
