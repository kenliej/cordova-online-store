<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AuthRegisterTest extends TestCase
{
    use InteractsWithUploads, RefreshDatabase;

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'New Customer',
            'email' => 'new.customer@example.test',
            'phone' => '09171234567',
            'address' => 'Cordova, Cebu',
            'birthday' => now()->subYears(20)->toDateString(),
            'gender' => 'Real Men',
            'password' => 'Customer#2026Pass',
            'password_confirmation' => 'Customer#2026Pass',
            'agree_terms' => true,
        ], $overrides);
    }

    /** @return array<string, UploadedFile> */
    private function documents(): array
    {
        return [
            'id_front' => $this->fakePng('front.png'),
            'id_back' => $this->fakePng('back.png'),
        ];
    }

    public function test_registration_creates_pending_customer_with_private_id_documents(): void
    {
        Storage::fake('public');
        Storage::fake('private');

        $response = $this->stateful()->post('/api/auth/register', array_merge(
            $this->payload(),
            $this->documents(),
            ['profile_photo' => $this->fakePng('avatar.png')],
        ));

        $response->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $user = User::query()->where('email', 'new.customer@example.test')->firstOrFail();

        $this->assertSame(UserRole::Customer, $user->role);
        $this->assertSame(UserStatus::Pending, $user->status);
        $this->assertNull($user->customer_no);
        $this->assertTrue(Hash::check('Customer#2026Pass', $user->password));
        $this->assertCount(2, $user->idDocuments);
        $this->assertSame('image/png', $user->idDocuments->first()->mime);
        $this->assertTrue(Storage::disk('private')->exists($user->idDocuments->first()->path));
        $this->assertCount(2, Storage::disk('private')->allFiles());
        $this->assertNotNull($user->profile_photo_url);
        $this->assertStringContainsString('/storage/', $user->profile_photo_url);
        $this->assertDatabaseHas('audit_logs', ['action' => 'account.register']);

        // Registration must not log the user in (admin approval required).
        $this->assertGuest();
    }

    public function test_registration_requires_adult_age(): void
    {
        Storage::fake('private');

        $response = $this->stateful()->post('/api/auth/register', array_merge(
            $this->payload(['birthday' => now()->subYears(17)->toDateString()]),
            $this->documents(),
        ));

        $response->assertStatus(422)->assertJsonValidationErrors('birthday');
        $this->assertDatabaseCount('users', 0);
    }

    public function test_registration_rejects_duplicate_email_and_phone(): void
    {
        Storage::fake('private');
        $existing = User::factory()->create();

        $response = $this->stateful()->post('/api/auth/register', array_merge(
            $this->payload(['email' => $existing->email, 'phone' => $existing->phone]),
            $this->documents(),
        ));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'phone']);
    }

    public function test_registration_requires_both_id_documents(): void
    {
        $response = $this->stateful()->post('/api/auth/register', $this->payload());

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['id_front', 'id_back']);
    }

    public function test_registration_rejects_non_image_id_documents(): void
    {
        $response = $this->stateful()->post('/api/auth/register', array_merge($this->payload(), [
            'id_front' => UploadedFile::fake()->create('front.pdf', 100, 'application/pdf'),
            'id_back' => UploadedFile::fake()->create('back.pdf', 100, 'application/pdf'),
        ]));

        $response->assertStatus(422)->assertJsonValidationErrors(['id_front', 'id_back']);
    }

    public function test_registration_rejects_weak_password_and_terms(): void
    {
        Storage::fake('private');

        $response = $this->stateful()->post('/api/auth/register', array_merge(
            $this->payload(['password' => 'short', 'password_confirmation' => 'short', 'agree_terms' => false]),
            $this->documents(),
        ));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password', 'agree_terms']);
    }
}
