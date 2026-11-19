<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Auth\InteractsWithUploads;
use Tests\TestCase;

class WorkersTest extends TestCase
{
    use InteractsWithUploads, RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        return $admin;
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'New Mall Worker',
            'email' => 'new.worker@example.test',
            'phone' => '09175550001',
            'address' => 'Cordova, Cebu',
            'birthday' => '1992-02-02',
            'gender' => 'Real Men',
            'password' => 'Worker#2026Pass',
        ], $overrides);
    }

    public function test_guest_cannot_list_workers(): void
    {
        $this->getJson('/api/admin/workers')->assertUnauthorized();
    }

    public function test_customer_cannot_manage_workers(): void
    {
        Sanctum::actingAs(User::factory()->customer()->create());

        $this->getJson('/api/admin/workers')->assertForbidden();
        $this->postJson('/api/admin/workers', $this->payload())->assertForbidden();
    }

    public function test_index_lists_only_active_workers(): void
    {
        $activeWorkers = User::factory()->worker()->count(2)->create();
        User::factory()->worker()->removed()->create();
        User::factory()->customer()->create();

        $this->actingAsAdmin();

        $response = $this->getJson('/api/admin/workers');

        $response->assertOk()->assertJsonCount(2, 'data');
        $this->assertEqualsCanonicalizing(
            $activeWorkers->pluck('id')->all(),
            collect($response->json('data'))->pluck('id')->all(),
        );
    }

    public function test_admin_can_create_worker(): void
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/admin/workers', $this->payload());

        $response->assertCreated()
            ->assertJsonPath('data.role', 'worker')
            ->assertJsonPath('data.status', 'active');

        $worker = User::query()->where('email', 'new.worker@example.test')->firstOrFail();

        $this->assertSame('worker', $worker->role->value);
        $this->assertSame('active', $worker->status->value);
        $this->assertMatchesRegularExpression('/^\d{12}$/', (string) $worker->worker_no);
        $this->assertNull($worker->customer_no);
        $this->assertTrue(Hash::check('Worker#2026Pass', $worker->password));
        $this->assertDatabaseHas('audit_logs', ['action' => 'worker.create', 'subject_id' => $worker->id]);
    }

    public function test_create_worker_validates_input(): void
    {
        $existing = User::factory()->create();
        $this->actingAsAdmin();

        $this->postJson('/api/admin/workers', $this->payload([
            'email' => $existing->email,
            'password' => 'weak',
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_admin_can_update_worker_and_keeps_password_when_blank(): void
    {
        $worker = User::factory()->worker()->create(['password' => 'Original#2026Pass']);

        $this->actingAsAdmin();

        $this->patchJson('/api/admin/workers/'.$worker->id, [
            'name' => 'Renamed Worker',
            'address' => 'Updated Address',
            'password' => '',
        ])->assertOk()->assertJsonPath('data.name', 'Renamed Worker');

        $worker->refresh();
        $this->assertSame('Renamed Worker', $worker->name);
        $this->assertTrue(Hash::check('Original#2026Pass', $worker->password));
        $this->assertDatabaseHas('audit_logs', ['action' => 'worker.update', 'subject_id' => $worker->id]);
    }

    public function test_admin_can_change_worker_password(): void
    {
        $worker = User::factory()->worker()->create(['password' => 'Original#2026Pass']);

        $this->actingAsAdmin();

        $this->patchJson('/api/admin/workers/'.$worker->id, [
            'password' => 'Changed#2026Pass',
        ])->assertOk();

        $this->assertTrue(Hash::check('Changed#2026Pass', $worker->refresh()->password));
    }

    public function test_admin_cannot_edit_another_admin_through_workers_endpoint(): void
    {
        $otherAdmin = User::factory()->admin()->create();

        $this->actingAsAdmin();

        $this->patchJson('/api/admin/workers/'.$otherAdmin->id, ['name' => 'Nope'])
            ->assertStatus(403)
            ->assertJsonPath('code', 'cannot_edit_admin');
    }

    public function test_admin_can_remove_worker(): void
    {
        $worker = User::factory()->worker()->create();

        DB::table('sessions')->insert([
            'id' => 'worker-session-1',
            'user_id' => $worker->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit',
            'payload' => 'payload',
            'last_activity' => time(),
        ]);

        $this->actingAsAdmin();

        $this->deleteJson('/api/admin/workers/'.$worker->id)
            ->assertOk()
            ->assertJsonPath('data.status', 'removed');

        $this->assertDatabaseHas('audit_logs', ['action' => 'worker.remove', 'subject_id' => $worker->id]);
        $this->assertDatabaseMissing('sessions', ['id' => 'worker-session-1']);
    }

    public function test_admin_cannot_remove_an_admin_through_workers_endpoint(): void
    {
        $otherAdmin = User::factory()->admin()->create();

        $this->actingAsAdmin();

        $this->deleteJson('/api/admin/workers/'.$otherAdmin->id)
            ->assertStatus(403)
            ->assertJsonPath('code', 'cannot_remove_admin');
    }

    public function test_removed_worker_cannot_be_removed_again(): void
    {
        $worker = User::factory()->worker()->removed()->create();

        $this->actingAsAdmin();

        $this->deleteJson('/api/admin/workers/'.$worker->id)
            ->assertStatus(409)
            ->assertJsonPath('code', 'invalid_account_status');
    }

    public function test_removed_worker_cannot_be_edited(): void
    {
        $worker = User::factory()->worker()->removed()->create();

        $this->actingAsAdmin();

        $this->patchJson('/api/admin/workers/'.$worker->id, ['name' => 'Nope'])
            ->assertStatus(409)
            ->assertJsonPath('code', 'invalid_account_status');
    }
}
