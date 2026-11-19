<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AuthPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_returns_ok_for_unknown_email(): void
    {
        Mail::fake();

        $this->postJson('/api/auth/forgot-password', ['email' => 'nobody@example.test'])
            ->assertOk();
    }

    public function test_forgot_password_creates_reset_token_for_known_email(): void
    {
        Mail::fake();
        $user = User::factory()->customer()->create();

        $this->postJson('/api/auth/forgot-password', ['email' => $user->email])
            ->assertOk();

        $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_password_can_be_reset_with_a_valid_token(): void
    {
        $user = User::factory()->customer()->create(['password' => 'OldPassword#2026']);
        $token = Password::broker()->createToken($user);

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NewPassword#2026',
            'password_confirmation' => 'NewPassword#2026',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('NewPassword#2026', $user->refresh()->password));
    }

    public function test_reset_password_rejects_invalid_token(): void
    {
        $user = User::factory()->customer()->create();

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => 'not-a-valid-token',
            'email' => $user->email,
            'password' => 'NewPassword#2026',
            'password_confirmation' => 'NewPassword#2026',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_reset_password_enforces_strong_password(): void
    {
        $user = User::factory()->customer()->create();
        $token = Password::broker()->createToken($user);

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'weakpass',
            'password_confirmation' => 'weakpass',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('password');
    }
}
