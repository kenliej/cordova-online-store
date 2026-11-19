<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Auth\InteractsWithUploads;
use Tests\TestCase;

class AccountsTest extends TestCase
{
    use InteractsWithUploads, RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_guest_cannot_list_accounts(): void
    {
        $this->getJson('/api/admin/accounts?tab=pending')->assertUnauthorized();
    }

    public function test_customer_cannot_list_accounts(): void
    {
        Sanctum::actingAs(User::factory()->customer()->create());

        $this->getJson('/api/admin/accounts?tab=pending')->assertForbidden();
    }

    public function test_index_filters_by_tab(): void
    {
        $pending = User::factory()->pending()->create();
        $customer = User::factory()->customer()->create();
        $worker = User::factory()->worker()->create();
        User::factory()->removed()->create();
        User::factory()->banned()->create();

        $this->actingAsAdmin();

        $this->getJson('/api/admin/accounts?tab=pending')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $pending->id)
            ->assertJsonPath('data.0.status', 'pending');

        $this->getJson('/api/admin/accounts?tab=customer')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $customer->id);

        $this->getJson('/api/admin/accounts?tab=worker')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $worker->id)
            ->assertJsonPath('data.0.worker_no', $worker->worker_no);

        $this->getJson('/api/admin/accounts?tab=removed')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);
    }

    public function test_index_requires_a_valid_tab(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/admin/accounts')
            ->assertStatus(422)
            ->assertJsonValidationErrors('tab');

        $this->getJson('/api/admin/accounts?tab=nope')
            ->assertStatus(422)
            ->assertJsonValidationErrors('tab');
    }

    public function test_index_searches_accounts_by_name_email_phone_or_number(): void
    {
        $customer = User::factory()->customer()->create(['name' => 'Zelda Unique Customer']);

        $this->actingAsAdmin();

        $this->getJson('/api/admin/accounts?tab=customer&search=Zelda')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $customer->id);

        $this->getJson('/api/admin/accounts?tab=customer&search='.$customer->customer_no)
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->getJson('/api/admin/accounts?tab=customer&search='.$customer->phone)
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->getJson('/api/admin/accounts?tab=customer&search=no-such-account')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
    }

    public function test_index_paginates_with_meta_envelope(): void
    {
        User::factory()->customer()->count(3)->create();

        $this->actingAsAdmin();

        $this->getJson('/api/admin/accounts?tab=customer&per_page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.total', 3);
    }

    public function test_pending_account_rows_include_id_documents_count(): void
    {
        $pending = User::factory()->pending()->create();
        $pending->idDocuments()->create([
            'type' => 'id_front',
            'path' => 'seed/id-documents/front-placeholder.png',
            'original_name' => 'front.png',
            'mime' => 'image/png',
            'size_bytes' => 68,
        ]);

        $this->actingAsAdmin();

        $this->getJson('/api/admin/accounts?tab=pending')
            ->assertOk()
            ->assertJsonPath('data.0.id_documents_count', 1);
    }

    public function test_admin_can_approve_pending_customer(): void
    {
        $pending = User::factory()->pending()->create();

        $this->actingAsAdmin();

        $response = $this->postJson('/api/admin/accounts/'.$pending->id.'/approve');

        $response->assertOk()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.role', 'customer');

        $pending->refresh();

        $this->assertSame('active', $pending->status->value);
        $this->assertMatchesRegularExpression('/^\d{12}$/', (string) $pending->customer_no);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'account.approve',
            'subject_id' => $pending->id,
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $pending->id,
            'category' => 'system',
        ]);
    }

    public function test_approving_an_active_account_returns_conflict(): void
    {
        $customer = User::factory()->customer()->create();

        $this->actingAsAdmin();

        $this->postJson('/api/admin/accounts/'.$customer->id.'/approve')
            ->assertStatus(409)
            ->assertJsonPath('code', 'invalid_account_status');
    }

    public function test_non_admin_cannot_approve(): void
    {
        $pending = User::factory()->pending()->create();
        Sanctum::actingAs(User::factory()->customer()->create());

        $this->postJson('/api/admin/accounts/'.$pending->id.'/approve')->assertForbidden();
    }

    public function test_admin_can_reject_pending_customer(): void
    {
        $pending = User::factory()->pending()->create();

        $this->actingAsAdmin();

        $this->postJson('/api/admin/accounts/'.$pending->id.'/reject')
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'account.reject',
            'subject_id' => $pending->id,
        ]);
    }

    public function test_admin_can_remove_active_customer(): void
    {
        $customer = User::factory()->customer()->create();

        $this->actingAsAdmin();

        $this->postJson('/api/admin/accounts/'.$customer->id.'/remove')
            ->assertOk()
            ->assertJsonPath('data.status', 'removed');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'account.remove',
            'subject_id' => $customer->id,
        ]);
    }

    public function test_customer_with_two_bad_records_is_banned_instead_of_removed(): void
    {
        $customer = User::factory()->customer()->withBadRecords(2)->create();

        $this->actingAsAdmin();

        $this->postJson('/api/admin/accounts/'.$customer->id.'/remove')
            ->assertOk()
            ->assertJsonPath('data.status', 'banned');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'account.ban',
            'subject_id' => $customer->id,
        ]);
    }

    public function test_admin_cannot_remove_self(): void
    {
        $admin = $this->actingAsAdmin();

        $this->postJson('/api/admin/accounts/'.$admin->id.'/remove')
            ->assertStatus(403)
            ->assertJsonPath('code', 'cannot_remove_admin');
    }

    public function test_admin_cannot_remove_another_admin(): void
    {
        $otherAdmin = User::factory()->admin()->create();

        $this->actingAsAdmin();

        $this->postJson('/api/admin/accounts/'.$otherAdmin->id.'/remove')
            ->assertStatus(403)
            ->assertJsonPath('code', 'cannot_remove_admin');
    }

    public function test_removing_an_account_revokes_its_sessions(): void
    {
        $customer = User::factory()->customer()->create();

        DB::table('sessions')->insert([
            'id' => 'customer-session-1',
            'user_id' => $customer->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit',
            'payload' => 'payload',
            'last_activity' => time(),
        ]);

        $this->actingAsAdmin();

        $this->postJson('/api/admin/accounts/'.$customer->id.'/remove')->assertOk();

        $this->assertDatabaseMissing('sessions', ['id' => 'customer-session-1']);
    }

    public function test_admin_can_restore_removed_and_banned_accounts(): void
    {
        $removed = User::factory()->removed()->create();
        $banned = User::factory()->banned()->create();

        $this->actingAsAdmin();

        $this->postJson('/api/admin/accounts/'.$removed->id.'/restore')
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->postJson('/api/admin/accounts/'.$banned->id.'/restore')
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'account.restore',
            'subject_id' => $removed->id,
        ]);
    }

    public function test_restoring_an_active_account_returns_conflict(): void
    {
        $customer = User::factory()->customer()->create();

        $this->actingAsAdmin();

        $this->postJson('/api/admin/accounts/'.$customer->id.'/restore')
            ->assertStatus(409)
            ->assertJsonPath('code', 'invalid_account_status');
    }

    public function test_admin_can_fetch_id_document_metadata_and_download_files(): void
    {
        Storage::fake('private');
        $pending = User::factory()->pending()->create();

        Storage::disk('private')->put('seed/id-documents/front.png', $this->tinyPngBytes());
        $front = $pending->idDocuments()->create([
            'type' => 'id_front',
            'path' => 'seed/id-documents/front.png',
            'original_name' => 'front.png',
            'mime' => 'image/png',
            'size_bytes' => 68,
        ]);

        $this->actingAsAdmin();

        $response = $this->getJson('/api/admin/accounts/'.$pending->id.'/id-documents');

        $response->assertOk()
            ->assertJsonPath('data.user.id', $pending->id)
            ->assertJsonPath('data.documents.0.id', $front->id)
            ->assertJsonPath('data.documents.0.type', 'id_front');

        $url = $response->json('data.id_front_url');
        $this->assertIsString($url);
        $this->assertStringNotContainsString('seed/id-documents', (string) $url);

        $path = parse_url($url, PHP_URL_PATH);
        $this->get($path)->assertOk();
    }
}
