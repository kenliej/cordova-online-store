<?php

namespace Tests\Feature\Notifications;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private function customer(): User
    {
        return User::factory()->create();
    }

    public function test_index_returns_own_notifications_with_counts_and_unread(): void
    {
        $user = $this->customer();
        $other = $this->customer();

        Notification::factory()->category('offers')->create(['user_id' => $user->id, 'title' => 'Flash sale']);
        Notification::factory()->category('offers')->read()->create(['user_id' => $user->id, 'title' => 'Discount Reminder']);
        Notification::factory()->category('order')->create(['user_id' => $user->id, 'title' => 'Order Ready']);
        Notification::factory()->category('system')->create(['user_id' => $user->id, 'title' => 'New Update ver 1.1']);
        Notification::factory()->category('system')->create(['user_id' => $other->id, 'title' => 'Other user notice']);

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/notifications')->assertOk();

        $data = $response->json('data');
        $counts = $response->json('counts');

        $this->assertCount(4, $data);
        $this->assertSame(4, $counts['all']);
        $this->assertSame(2, $counts['offers']);
        $this->assertSame(1, $counts['order']);
        $this->assertSame(1, $counts['system']);
        $this->assertSame(3, $response->json('unread'));

        $this->assertNotContains('Other user notice', array_column($data, 'title'));

        $flashSale = collect($data)->firstWhere('title', 'Flash sale');
        $this->assertNotNull($flashSale);
        $this->assertSame('offers', $flashSale['category']);
        $this->assertSame('Offers & Sales', $flashSale['category_label']);
        $this->assertArrayHasKey('is_read', $flashSale);
    }

    public function test_notifications_are_newest_first(): void
    {
        $user = $this->customer();
        $older = Notification::factory()->create([
            'user_id' => $user->id,
            'created_at' => now()->subHours(5),
        ]);
        $newer = Notification::factory()->create([
            'user_id' => $user->id,
            'created_at' => now()->subMinutes(5),
        ]);

        Sanctum::actingAs($user);
        $data = $this->getJson('/api/notifications')->assertOk()->json('data');

        $this->assertSame($newer->id, $data[0]['id']);
        $this->assertSame($older->id, $data[1]['id']);
    }

    public function test_category_filter_accepts_values_and_ui_labels(): void
    {
        $user = $this->customer();
        Notification::factory()->category('offers')->create(['user_id' => $user->id]);
        Notification::factory()->category('order')->create(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $byValue = $this->getJson('/api/notifications?category=offers')->assertOk()->json('data');
        $this->assertCount(1, $byValue);
        $this->assertSame('offers', $byValue[0]['category']);

        $byLabel = $this->getJson('/api/notifications?category='.urlencode('Offers & Sales'))
            ->assertOk()
            ->json('data');
        $this->assertCount(1, $byLabel);

        $this->getJson('/api/notifications?category=bogus')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['category']);
    }

    public function test_search_filters_title_and_body(): void
    {
        $user = $this->customer();
        Notification::factory()->create(['user_id' => $user->id, 'title' => 'Flash sale', 'body' => 'Up to 50% off']);
        Notification::factory()->create(['user_id' => $user->id, 'title' => 'Order Ready', 'body' => 'Claim at the counter']);
        Notification::factory()->create(['user_id' => $user->id, 'title' => 'System', 'body' => 'Maintenance tonight']);

        Sanctum::actingAs($user);

        $byTitle = $this->getJson('/api/notifications?search=flash')->assertOk()->json('data');
        $this->assertCount(1, $byTitle);
        $this->assertSame('Flash sale', $byTitle[0]['title']);

        $byBody = $this->getJson('/api/notifications?search=counter')->assertOk()->json('data');
        $this->assertCount(1, $byBody);
        $this->assertSame('Order Ready', $byBody[0]['title']);
    }

    public function test_mark_single_notification_as_read(): void
    {
        $user = $this->customer();
        $notification = Notification::factory()->create(['user_id' => $user->id]);

        Sanctum::actingAs($user);
        $response = $this->patchJson("/api/notifications/{$notification->id}/read")->assertOk();

        $this->assertTrue($response->json('data.notification.is_read'));
        $this->assertSame(0, $response->json('data.unread'));
        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_cannot_mark_another_users_notification_as_read(): void
    {
        $owner = $this->customer();
        $intruder = $this->customer();
        $notification = Notification::factory()->create(['user_id' => $owner->id]);

        Sanctum::actingAs($intruder);
        $this->patchJson("/api/notifications/{$notification->id}/read")->assertNotFound();

        $this->assertNull($notification->fresh()->read_at);
    }

    public function test_mark_all_as_read_only_affects_own_notifications(): void
    {
        $user = $this->customer();
        $other = $this->customer();
        Notification::factory()->count(2)->create(['user_id' => $user->id]);
        $foreign = Notification::factory()->create(['user_id' => $other->id]);

        Sanctum::actingAs($user);
        $response = $this->postJson('/api/notifications/read-all')->assertOk();

        $this->assertSame(2, $response->json('data.updated'));
        $this->assertSame(0, $response->json('data.unread'));
        $this->assertSame(0, Notification::query()->where('user_id', $user->id)->whereNull('read_at')->count());
        $this->assertNull($foreign->fresh()->read_at);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/notifications')->assertUnauthorized();
    }
}
