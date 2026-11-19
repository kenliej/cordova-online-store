<?php

namespace Tests\Feature;

use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ContactTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, string>
     */
    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Maria Santos',
            'email' => 'maria.santos@example.com',
            'phone' => '09171234567',
            'subject' => 'Inquiry about store operating hours',
            'message' => 'Hi! What time does the pickup counter open on Sundays? Thank you.',
        ], $overrides);
    }

    public function test_public_contact_form_stores_a_new_message(): void
    {
        $response = $this->postJson('/api/contact', $this->validPayload());

        $response->assertCreated()->assertJsonPath('message', 'Your message has been sent successfully!');

        $message = ContactMessage::query()->firstOrFail();
        $this->assertSame('Maria Santos', $message->name);
        $this->assertSame('new', $message->status);
        $this->assertSame('127.0.0.1', $message->ip_address);
        $this->assertNotNull($message->user_agent);
    }

    public function test_honeypot_is_silently_accepted_without_persisting(): void
    {
        $response = $this->postJson('/api/contact', $this->validPayload(['website' => 'https://spam.example']));

        $response->assertCreated()->assertJsonPath('message', 'Your message has been sent successfully!');
        $this->assertSame(0, ContactMessage::query()->count());
    }

    public function test_validation_errors_are_returned(): void
    {
        $this->postJson('/api/contact', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'phone', 'subject', 'message']);

        $this->postJson('/api/contact', $this->validPayload([
            'email' => 'not-an-email',
            'phone' => 'abc',
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'phone']);
    }

    public function test_legacy_ui_field_names_are_accepted(): void
    {
        $this->postJson('/api/contact', [
            'fullName' => 'Sherwynn James Misula',
            'email' => 'sherwynn@example.com',
            'phoneNumber' => '09181234567',
            'subject' => 'Store partnership',
            'message' => 'I would like to inquire about opening a store inside the mall.',
            'captchaVerified' => true,
        ])->assertCreated();

        $this->assertDatabaseHas('contact_messages', [
            'name' => 'Sherwynn James Misula',
            'phone' => '09181234567',
        ]);
    }

    public function test_admin_can_list_contact_messages_paginated(): void
    {
        ContactMessage::query()->create([
            'name' => 'A', 'email' => 'a@example.com', 'phone' => '09170000001',
            'subject' => 'One', 'message' => 'first', 'status' => 'new',
        ]);
        ContactMessage::query()->create([
            'name' => 'B', 'email' => 'b@example.com', 'phone' => '09170000002',
            'subject' => 'Two', 'message' => 'second', 'status' => 'replied',
        ]);

        Sanctum::actingAs(User::factory()->admin()->create());
        $response = $this->getJson('/api/admin/contact-messages')->assertOk();

        $this->assertCount(2, $response->json('data'));
        $this->assertArrayHasKey('meta', $response->json());

        $filtered = $this->getJson('/api/admin/contact-messages?status=new')->assertOk()->json('data');
        $this->assertCount(1, $filtered);
        $this->assertSame('One', $filtered[0]['subject']);
    }

    public function test_admin_can_update_message_status(): void
    {
        $message = ContactMessage::query()->create([
            'name' => 'A', 'email' => 'a@example.com', 'phone' => '09170000001',
            'subject' => 'One', 'message' => 'first', 'status' => 'new',
        ]);

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->patchJson("/api/admin/contact-messages/{$message->id}", ['status' => 'read'])
            ->assertOk()
            ->assertJsonPath('data.status', 'read');

        $this->assertSame('read', $message->fresh()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'contact_message.status_updated']);

        $this->patchJson("/api/admin/contact-messages/{$message->id}", ['status' => 'bogus'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_non_admin_cannot_manage_contact_messages(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/admin/contact-messages')->assertForbidden();

        Sanctum::actingAs(User::factory()->worker()->create());
        $this->getJson('/api/admin/contact-messages')->assertForbidden();
    }

    public function test_guest_cannot_list_contact_messages(): void
    {
        $this->getJson('/api/admin/contact-messages')->assertUnauthorized();
    }
}
