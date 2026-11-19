<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AuthProfileTest extends TestCase
{
    use InteractsWithUploads, RefreshDatabase;

    public function test_profile_show_returns_own_data_and_id_document_flags(): void
    {
        Storage::fake('private');
        $user = User::factory()->customer()->create();

        $user->idDocuments()->create([
            'type' => 'id_front',
            'path' => 'id-documents/'.$user->id.'/front.png',
            'original_name' => 'front.png',
            'mime' => 'image/png',
            'size_bytes' => 68,
        ]);

        $response = $this->actingAs($user)->getJson('/api/profile');

        $response->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.id_documents.id_front', true)
            ->assertJsonPath('data.id_documents.id_back', false)
            // Security: the profile endpoint exposes metadata only, never
            // download URLs for government ID scans.
            ->assertJsonMissingPath('data.documents')
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.remember_token');

        $this->assertStringNotContainsString('id-documents/', $response->getContent());
    }

    public function test_profile_show_requires_authentication(): void
    {
        $this->getJson('/api/profile')->assertUnauthorized();
    }

    public function test_profile_update_only_changes_mutable_fields(): void
    {
        $user = User::factory()->customer()->create();

        $response = $this->actingAs($user)->patchJson('/api/profile', [
            'name' => 'Updated Name',
            'phone' => '09179999999',
            'address' => 'New Address, Cebu',
            'gender' => 'Female',
            'birthday' => '1990-01-01',
            // Malicious attempts that must be ignored:
            'role' => 'admin',
            'status' => 'banned',
            'email' => 'hacked@example.test',
            'customer_no' => '999999999999',
        ]);

        $response->assertOk()->assertJsonPath('data.name', 'Updated Name');

        $user->refresh();
        $this->assertSame('Updated Name', $user->name);
        $this->assertSame('09179999999', $user->phone);
        $this->assertSame('1990-01-01', $user->birthday?->toDateString());
        $this->assertSame('customer', $user->role->value);
        $this->assertSame('active', $user->status->value);
        $this->assertNotSame('hacked@example.test', $user->email);
    }

    public function test_profile_update_rejects_duplicate_phone(): void
    {
        $other = User::factory()->create();
        $user = User::factory()->customer()->create();

        $response = $this->actingAs($user)->patchJson('/api/profile', [
            'phone' => $other->phone,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('phone');
    }

    public function test_password_change_requires_current_password(): void
    {
        $user = User::factory()->customer()->create(['password' => 'OldPassword#2026']);

        $response = $this->actingAs($user)->patchJson('/api/profile/password', [
            'current_password' => 'not-my-password',
            'password' => 'NewPassword#2026',
            'password_confirmation' => 'NewPassword#2026',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('current_password');
        $this->assertTrue(Hash::check('OldPassword#2026', $user->refresh()->password));
    }

    public function test_password_change_updates_the_password(): void
    {
        $user = User::factory()->customer()->create(['password' => 'OldPassword#2026']);

        $response = $this->actingAs($user)->patchJson('/api/profile/password', [
            'current_password' => 'OldPassword#2026',
            'password' => 'NewPassword#2026',
            'password_confirmation' => 'NewPassword#2026',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('NewPassword#2026', $user->refresh()->password));
    }

    public function test_avatar_upload_stores_on_public_disk_and_returns_url(): void
    {
        Storage::fake('public');
        $user = User::factory()->customer()->create();

        $response = $this->actingAs($user)
            ->withHeader('Accept', 'application/json')
            ->post('/api/profile/avatar', ['avatar' => $this->fakePng('avatar.png')]);

        $response->assertOk();
        $this->assertNotNull($response->json('data.profile_photo_url'));

        $user->refresh();
        $this->assertNotNull($user->profile_photo_path);
        $this->assertTrue(Storage::disk('public')->exists($user->profile_photo_path));
    }

    public function test_avatar_upload_rejects_oversized_file(): void
    {
        Storage::fake('public');
        $user = User::factory()->customer()->create();

        $response = $this->actingAs($user)
            ->withHeader('Accept', 'application/json')
            ->post('/api/profile/avatar', [
                'avatar' => UploadedFile::fake()->create('big.png', 3000, 'image/png'),
            ]);

        $response->assertStatus(422)->assertJsonValidationErrors('avatar');
    }

    public function test_owner_can_download_own_id_document(): void
    {
        Storage::fake('private');
        $user = User::factory()->customer()->create();

        Storage::disk('private')->put('id-documents/'.$user->id.'/front.png', $this->tinyPngBytes());
        $document = $user->idDocuments()->create([
            'type' => 'id_front',
            'path' => 'id-documents/'.$user->id.'/front.png',
            'original_name' => 'front.png',
            'mime' => 'image/png',
            'size_bytes' => 68,
        ]);

        $this->actingAs($user)
            ->get('/api/profile/id-documents/'.$document->id)
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');
    }

    public function test_customer_cannot_download_another_customers_id_document(): void
    {
        Storage::fake('private');
        $owner = User::factory()->customer()->create();
        $intruder = User::factory()->customer()->create();

        Storage::disk('private')->put('id-documents/'.$owner->id.'/front.png', $this->tinyPngBytes());
        $document = $owner->idDocuments()->create([
            'type' => 'id_front',
            'path' => 'id-documents/'.$owner->id.'/front.png',
            'original_name' => 'front.png',
            'mime' => 'image/png',
            'size_bytes' => 68,
        ]);

        $this->actingAs($intruder)
            ->get('/api/profile/id-documents/'.$document->id)
            ->assertNotFound();
    }

    public function test_admin_can_download_any_id_document(): void
    {
        Storage::fake('private');
        $owner = User::factory()->customer()->create();
        $admin = User::factory()->admin()->create();

        Storage::disk('private')->put('id-documents/'.$owner->id.'/back.png', $this->tinyPngBytes());
        $document = $owner->idDocuments()->create([
            'type' => 'id_back',
            'path' => 'id-documents/'.$owner->id.'/back.png',
            'original_name' => 'back.png',
            'mime' => 'image/png',
            'size_bytes' => 68,
        ]);

        $this->actingAs($admin)
            ->get('/api/profile/id-documents/'.$document->id)
            ->assertOk();
    }

    public function test_id_document_download_requires_authentication(): void
    {
        Storage::fake('private');
        $owner = User::factory()->customer()->create();
        $document = $owner->idDocuments()->create([
            'type' => 'id_front',
            'path' => 'id-documents/'.$owner->id.'/front.png',
            'original_name' => 'front.png',
            'mime' => 'image/png',
            'size_bytes' => 68,
        ]);

        $this->getJson('/api/profile/id-documents/'.$document->id)->assertUnauthorized();
    }
}
