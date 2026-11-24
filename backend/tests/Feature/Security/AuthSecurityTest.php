<?php

namespace Tests\Feature\Security;

use App\Models\Order;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * A07 — Identification & Authentication failures.
 *
 * Inactive accounts, password policy, reset-token lifecycle, session/token
 * revocation on ban, and account enumeration through auth responses.
 */
class AuthSecurityTest extends TestCase
{
    use RefreshDatabase, SecurityTestSupport;

    public function test_all_inactive_account_states_cannot_log_in_with_stable_codes(): void
    {
        $cases = [
            'pending' => 'account_pending',
            'rejected' => 'account_rejected',
            'removed' => 'account_removed',
            'banned' => 'account_banned',
        ];

        foreach ($cases as $state => $expectedCode) {
            $user = User::factory()->{$state}()->create([
                'password' => 'Login#2026Secure',
            ]);

            $response = $this->postJson('/api/auth/login', [
                'login' => $user->email,
                'password' => 'Login#2026Secure',
            ]);

            $response->assertStatus(403)->assertJsonPath('code', $expectedCode);
            $this->assertGuest();
        }
    }

    public function test_banning_an_account_deletes_its_sessions_and_api_tokens(): void
    {
        $customer = User::factory()->create();
        $sessionId = $this->sessionRowFor($customer);
        $plainToken = $this->tokenFor($customer);
        $this->assertDatabaseHas('sessions', ['id' => $sessionId]);
        $this->assertDatabaseHas('personal_access_tokens', ['tokenable_id' => $customer->getKey()]);

        // Ban through the model status update (same path used by admin remove
        // and by the commerce auto-ban): the booted() hook must revoke access.
        $customer->forceFill(['status' => 'banned'])->save();

        $this->assertDatabaseMissing('sessions', ['id' => $sessionId]);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $customer->getKey(),
            'tokenable_type' => User::class,
        ]);

        // The revoked bearer token can no longer authenticate.
        $this->withHeader('Authorization', 'Bearer '.$plainToken)
            ->getJson('/api/auth/me')
            ->assertUnauthorized();
    }

    public function test_banning_an_account_rotates_the_remember_token(): void
    {
        $customer = User::factory()->create(['remember_token' => 'legacy-remember-token']);
        $this->assertNotNull($customer->fresh()->remember_token);

        $customer->forceFill(['status' => 'banned'])->save();

        // SEC-05 recheck: a stolen remember-me cookie must not survive a ban.
        $this->assertNotSame('legacy-remember-token', $customer->fresh()->remember_token);
    }

    public function test_admin_remove_of_a_bad_record_customer_results_in_ban_and_revocation(): void
    {
        $customer = User::factory()->withBadRecords(2)->create();
        $sessionId = $this->sessionRowFor($customer);
        $this->tokenFor($customer);

        $this->asAdmin();
        $this->postJson('/api/admin/accounts/'.$customer->getKey().'/remove')
            ->assertOk()
            ->assertJsonPath('data.status', 'banned');

        $this->assertDatabaseMissing('sessions', ['id' => $sessionId]);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $customer->getKey(),
        ]);
    }

    public function test_second_unclaimed_order_bans_the_customer_and_revokes_access(): void
    {
        Storage::fake('private');
        $customer = User::factory()->withBadRecords(1)->create();
        $sessionId = $this->sessionRowFor($customer);

        $order = Order::factory()->ready()->create([
            'user_id' => $customer->getKey(),
            'claim_deadline' => now()->subHour(),
        ]);

        $this->asWorker();
        $this->patchJson('/api/worker/orders/'.$order->getKey().'/status', ['status' => 'not_claimed'])
            ->assertOk();

        $customer->refresh();
        $this->assertSame(2, $customer->bad_records);
        $this->assertSame('banned', $customer->status->value);
        $this->assertDatabaseMissing('sessions', ['id' => $sessionId]);
    }

    public function test_profile_password_change_requires_current_password(): void
    {
        $customer = User::factory()->create([
            'password' => 'Current#2026Secure',
        ]);

        $this->actingAs($customer);
        $this->patchJson('/api/profile/password', [
            'current_password' => 'Wrong#2026Secure',
            'password' => 'Replacement#2026Secure',
            'password_confirmation' => 'Replacement#2026Secure',
        ])->assertStatus(422)->assertJsonValidationErrors('current_password');

        $this->assertTrue(Hash::check('Current#2026Secure', $customer->fresh()->password));
    }

    public function test_password_policy_is_enforced_everywhere(): void
    {
        Storage::fake('private');
        Storage::fake('public');

        $weakPasswords = [
            'short1!A',            // < 12 chars
            'alllowercase123!',    // no mixed case
            'ALLUPPERCASE123!',    // no lowercase
            'NoNumbersHere!A',     // no digit
            'NoSymbols12345A',     // no symbol
        ];

        foreach ($weakPasswords as $weak) {
            $response = $this->post('/api/auth/register', array_merge(
                $this->registerPayload([
                    'password' => $weak,
                    'password_confirmation' => $weak,
                ]),
                $this->idDocuments(),
            ));

            $response->assertStatus(422)->assertJsonValidationErrors('password');
        }

        $this->assertDatabaseCount('users', 0);

        // Strong password is accepted (registration still pending approval).
        $this->post('/api/auth/register', array_merge(
            $this->registerPayload(['email' => 'strong.'.uniqid().'@gaisano-cordova.com']),
            $this->idDocuments(),
        ))->assertCreated();

        // Weak password for a worker account created by an admin is rejected too.
        $this->asAdmin();
        $this->postJson('/api/admin/workers', [
            'name' => 'Weak Worker',
            'email' => 'weak.worker.'.uniqid().'@gaisano-cordova.com',
            'phone' => '0917'.random_int(1000000, 9999999),
            'password' => 'weakpassword1',
        ])->assertStatus(422)->assertJsonValidationErrors('password');

        // Weak password on reset is rejected as well.
        $user = User::factory()->create();
        $token = Password::broker()->createToken($user);
        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'weakpassword1',
            'password_confirmation' => 'weakpassword1',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_forgot_password_response_is_generic_and_always_200(): void
    {
        User::factory()->create(['email' => 'known.user@gaisano-cordova.com']);

        $existing = $this->postJson('/api/auth/forgot-password', ['email' => 'known.user@gaisano-cordova.com']);
        $unknown = $this->postJson('/api/auth/forgot-password', ['email' => 'nobody@gaisano-cordova.com']);

        $existing->assertOk();
        $unknown->assertOk();
        $this->assertSame(
            $existing->json('data.message'),
            $unknown->json('data.message'),
            'Forgot-password must not reveal whether the e-mail exists.',
        );
    }

    public function test_password_reset_is_disabled_when_flag_is_off(): void
    {
        config(['auth.password_reset_enabled' => false]);

        $user = User::factory()->create(['email' => 'disabled.reset@gaisano-cordova.com']);
        $token = Password::broker()->createToken($user);

        $this->postJson('/api/auth/forgot-password', ['email' => $user->email])
            ->assertNotFound();

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NewStrong#2026Pass',
            'password_confirmation' => 'NewStrong#2026Pass',
        ])->assertNotFound();

        $this->assertFalse(Hash::check('NewStrong#2026Pass', $user->fresh()->password));
    }

    public function test_password_reset_email_links_to_the_spa_reset_page(): void
    {
        Notification::fake();
        config(['app.frontend_url' => 'http://localhost:8080']);

        $user = User::factory()->create(['email' => 'reset.link@gaisano-cordova.com']);

        $this->postJson('/api/auth/forgot-password', ['email' => $user->email])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user): bool {
            $url = $notification->toMail($user)->actionUrl;

            $this->assertNotNull($url);
            $this->assertStringStartsWith('http://localhost:8080/reset-password/', $url);
            $this->assertStringContainsString('?email='.urlencode((string) $user->email), $url);
            $this->assertStringNotContainsString('/forgot-password', $url);

            return true;
        });
    }

    public function test_reset_token_is_single_use(): void
    {
        $user = User::factory()->create(['email' => 'reset.once@gaisano-cordova.com']);
        $token = Password::broker()->createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NewStrong#2026Pass',
            'password_confirmation' => 'NewStrong#2026Pass',
        ])->assertOk();

        $this->assertTrue(Hash::check('NewStrong#2026Pass', $user->fresh()->password));

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'Another#2026Pass',
            'password_confirmation' => 'Another#2026Pass',
        ])->assertStatus(422);
    }

    public function test_expired_reset_token_is_rejected(): void
    {
        $user = User::factory()->create(['email' => 'reset.expired@gaisano-cordova.com']);
        $token = Password::broker()->createToken($user);

        DB::table('password_reset_tokens')
            ->where('email', $user->email)
            ->update(['created_at' => now()->subMinutes(61)]);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NewStrong#2026Pass',
            'password_confirmation' => 'NewStrong#2026Pass',
        ])->assertStatus(422);

        $this->assertFalse(Hash::check('NewStrong#2026Pass', $user->fresh()->password));
    }

    public function test_reset_password_rejects_bogus_tokens(): void
    {
        User::factory()->create(['email' => 'bogus.token@gaisano-cordova.com']);

        $this->postJson('/api/auth/reset-password', [
            'token' => 'not-a-real-token',
            'email' => 'bogus.token@gaisano-cordova.com',
            'password' => 'NewStrong#2026Pass',
            'password_confirmation' => 'NewStrong#2026Pass',
        ])->assertStatus(422);
    }

    /**
     * SEC-02 (finding): a differing validation message lets an attacker
     * enumerate registered e-mail addresses through the reset endpoint.
     */
    public function test_reset_password_does_not_reveal_account_existence(): void
    {
        User::factory()->create(['email' => 'existing.account@gaisano-cordova.com']);

        $existing = $this->postJson('/api/auth/reset-password', [
            'token' => 'definitely-invalid-token',
            'email' => 'existing.account@gaisano-cordova.com',
            'password' => 'NewStrong#2026Pass',
            'password_confirmation' => 'NewStrong#2026Pass',
        ]);
        $unknown = $this->postJson('/api/auth/reset-password', [
            'token' => 'definitely-invalid-token',
            'email' => 'does.not.exist@gaisano-cordova.com',
            'password' => 'NewStrong#2026Pass',
            'password_confirmation' => 'NewStrong#2026Pass',
        ]);

        $this->assertSame(422, $existing->getStatusCode());
        $this->assertSame(422, $unknown->getStatusCode());
        $this->assertSame(
            $existing->json('message'),
            $unknown->json('message'),
            'SEC-02: reset-password leaks account existence through distinct messages.',
        );
    }

    /**
     * SEC-01 (finding): the password-reset e-mail URL is generated from the
     * attacker-controlled Host header (no TrustHosts / no forced root URL).
     */
    public function test_password_reset_email_is_not_poisoned_by_the_host_header(): void
    {
        $user = User::factory()->create([
            'email' => 'host.header@gaisano-cordova.com',
        ]);

        $response = $this->withServerVariables(['HTTP_HOST' => 'evil.attacker.test'])
            ->withHeaders(['Accept' => 'application/json'])
            ->postJson('/api/auth/forgot-password', ['email' => $user->email]);

        // Either the request is rejected (trusted hosts configured) or the
        // generated reset link must keep the canonical application host.
        if ($response->getStatusCode() !== 200) {
            $this->assertContains($response->getStatusCode(), [400, 403, 404, 421]);

            return;
        }

        $messages = Mail::mailer()->getSymfonyTransport()->messages();
        $this->assertNotEmpty($messages, 'No password reset mail was sent.');

        $email = $messages->last()->getOriginalMessage();
        $body = $email->getHtmlBody() ?? $email->getTextBody() ?? '';

        $this->assertStringNotContainsString(
            'evil.attacker.test',
            $body,
            'SEC-01: password-reset e-mail link uses the attacker-supplied Host header (account takeover).',
        );
    }

    public function test_login_endpoint_does_not_leak_password_or_remember_token(): void
    {
        $customer = User::factory()->create(['password' => 'Login#2026Secure']);

        $response = $this->postJson('/api/auth/login', [
            'login' => $customer->email,
            'password' => 'Login#2026Secure',
        ])->assertOk();

        $this->assertNoSensitiveKeys($response->json());
        $this->assertArrayNotHasKey('password', $response->json('data'));
        $this->assertArrayNotHasKey('remember_token', $response->json('data'));
    }

    public function test_banned_users_cannot_log_in_even_with_remember_me(): void
    {
        $user = User::factory()->banned()->create(['password' => 'Login#2026Secure']);

        $this->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'Login#2026Secure',
            'remember' => true,
        ])->assertStatus(403)->assertJsonPath('code', 'account_banned');
    }

    public function test_logout_invalidates_the_authenticated_session(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer);
        $this->postJson('/api/auth/logout')->assertNoContent();

        $this->assertGuest('web');
    }
}
