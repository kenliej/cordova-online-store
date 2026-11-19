<?php

namespace Tests\Feature\Console;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CreateAdminCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_creates_an_active_admin(): void
    {
        $this->artisan('user:create-admin', [
            'email' => 'owner@example.test',
            '--name' => 'Mall Owner',
            '--password' => 'Owner#2026Secure',
        ])->assertSuccessful();

        $user = User::query()->where('email', 'owner@example.test')->firstOrFail();

        $this->assertSame(UserRole::Admin, $user->role);
        $this->assertSame(UserStatus::Active, $user->status);
        $this->assertSame('Mall Owner', $user->name);
        $this->assertTrue(Hash::check('Owner#2026Secure', $user->password));
    }

    public function test_command_can_generate_a_password(): void
    {
        $this->artisan('user:create-admin', [
            'email' => 'generated@example.test',
        ])->expectsOutputToContain('Generated password:')->assertSuccessful();

        $this->assertDatabaseHas('users', [
            'email' => 'generated@example.test',
            'role' => UserRole::Admin->value,
            'status' => UserStatus::Active->value,
        ]);
    }

    public function test_command_promotes_an_existing_customer(): void
    {
        $customer = User::factory()->customer()->create([
            'email' => 'promote@example.test',
            'password' => 'OldPassword#2026',
        ]);

        $this->artisan('user:create-admin', [
            'email' => 'promote@example.test',
            '--password' => 'NewAdmin#2026Secure',
        ])->assertSuccessful();

        $customer->refresh();

        $this->assertSame(UserRole::Admin, $customer->role);
        $this->assertSame(UserStatus::Active, $customer->status);
        $this->assertTrue(Hash::check('NewAdmin#2026Secure', $customer->password));
    }

    public function test_command_rejects_weak_passwords(): void
    {
        $this->artisan('user:create-admin', [
            'email' => 'weak@example.test',
            '--password' => 'short',
        ])->assertFailed();

        $this->assertDatabaseMissing('users', ['email' => 'weak@example.test']);
    }
}
