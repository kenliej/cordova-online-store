<?php

namespace Tests\Feature\Admin;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SalesTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->admin()->create();
    }

    private function makeOrderAt(User $user, string $status, float $total, string $createdAt): Order
    {
        return Order::factory()->create([
            'user_id' => $user->id,
            'status' => $status,
            'subtotal' => $total,
            'total' => $total,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);
    }

    public function test_summary_aggregates_the_requested_month(): void
    {
        $customer = User::factory()->create();

        $this->makeOrderAt($customer, 'claimed', 300, '2026-10-03 10:00:00');
        $this->makeOrderAt($customer, 'claimed', 700, '2026-10-20 15:00:00');
        $this->makeOrderAt($customer, 'cancelled', 150, '2026-10-05 11:00:00');
        $this->makeOrderAt($customer, 'not_claimed', 50, '2026-10-06 12:00:00');
        $this->makeOrderAt($customer, 'pending', 25, '2026-10-07 09:00:00');
        // Outside the requested month.
        $this->makeOrderAt($customer, 'claimed', 9999, '2026-09-30 23:00:00');

        Sanctum::actingAs($this->admin());
        $data = $this->getJson('/api/admin/sales/summary?month=2026-10')->assertOk()->json('data');

        $this->assertSame('2026-10', $data['month']);
        $this->assertEquals(1000.0, (float) $data['revenue']);
        $this->assertSame(1, $data['cancelled_count']);
        $this->assertEquals(150.0, (float) $data['cancelled_total']);
        $this->assertSame(1, $data['not_claimed_count']);
        $this->assertEquals(50.0, (float) $data['not_claimed_total']);
        $this->assertSame(5, $data['orders_count']);
    }

    public function test_summary_defaults_to_the_current_month(): void
    {
        $customer = User::factory()->create();
        $this->makeOrderAt($customer, 'claimed', 123.45, now()->toDateTimeString());

        Sanctum::actingAs($this->admin());
        $data = $this->getJson('/api/admin/sales/summary')->assertOk()->json('data');

        $this->assertSame(now()->format('Y-m'), $data['month']);
        $this->assertEquals(123.45, (float) $data['revenue']);
        $this->assertSame(1, $data['orders_count']);
    }

    public function test_daily_sales_returns_totals_and_filtered_rows(): void
    {
        $customer = User::factory()->create(['name' => 'Shermaine Misula']);
        $product = Product::factory()->create(['name' => 'Yoga Mat', 'price' => 300]);

        $claimed = $this->makeOrderAt($customer, 'claimed', 300, '2026-10-22 10:00:00');
        $cancelled = $this->makeOrderAt($customer, 'cancelled', 150, '2026-10-22 11:00:00');
        $notClaimed = $this->makeOrderAt($customer, 'not_claimed', 50, '2026-10-22 12:00:00');
        $this->makeOrderAt($customer, 'pending', 25, '2026-10-22 13:00:00');
        $this->makeOrderAt($customer, 'claimed', 5000, '2026-10-21 10:00:00');

        OrderItem::create([
            'order_id' => $claimed->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'unit_price' => 300,
            'quantity' => 1,
            'line_total' => 300,
        ]);

        Sanctum::actingAs($this->admin());

        $data = $this->getJson('/api/admin/sales?date=2026-10-22')->assertOk()->json('data');
        $this->assertSame('2026-10-22', $data['date']);
        $this->assertEquals(300.0, (float) $data['revenue']);
        $this->assertEquals(150.0, (float) $data['cancelled_total']);
        $this->assertEquals(50.0, (float) $data['not_claimed_total']);
        $this->assertCount(4, $data['orders']);

        $claimedRow = collect($data['orders'])->firstWhere('id', $claimed->id);
        $this->assertSame('Claimed', $claimedRow['status']);
        $this->assertSame('claimed', $claimedRow['status_code']);
        $this->assertSame('Shermaine Misula', $claimedRow['customer']['name']);
        $this->assertSame('Yoga Mat', $claimedRow['items'][0]['title']);

        $claimedOnly = $this->getJson('/api/admin/sales?date=2026-10-22&status=claimed')
            ->assertOk()
            ->json('data');
        $this->assertCount(1, $claimedOnly['orders']);
        $this->assertSame([$claimed->id], array_column($claimedOnly['orders'], 'id'));
        // Revenue is always the claimed total for the day, regardless of tab filter.
        $this->assertEquals(300.0, (float) $claimedOnly['revenue']);

        $cancelledOnly = $this->getJson('/api/admin/sales?date=2026-10-22&status=cancelled')
            ->assertOk()
            ->json('data');
        $this->assertSame([$cancelled->id], array_column($cancelledOnly['orders'], 'id'));

        $notClaimedOnly = $this->getJson('/api/admin/sales?date=2026-10-22&status=not_claimed')
            ->assertOk()
            ->json('data');
        $this->assertSame([$notClaimed->id], array_column($notClaimedOnly['orders'], 'id'));
    }

    public function test_daily_sales_for_a_date_without_orders_is_empty(): void
    {
        Sanctum::actingAs($this->admin());

        $data = $this->getJson('/api/admin/sales?date=2020-01-01')->assertOk()->json('data');

        $this->assertSame([], $data['orders']);
        $this->assertEquals(0.0, (float) $data['revenue']);
    }

    public function test_invalid_parameters_are_rejected(): void
    {
        Sanctum::actingAs($this->admin());

        $this->getJson('/api/admin/sales/summary?month=2026-13')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['month']);

        $this->getJson('/api/admin/sales?date=22-10-2026')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['date']);

        $this->getJson('/api/admin/sales?status=bogus')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_non_admin_users_cannot_access_sales(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/admin/sales')->assertForbidden();

        Sanctum::actingAs(User::factory()->worker()->create());
        $this->getJson('/api/admin/sales')->assertForbidden();
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/admin/sales')->assertUnauthorized();
    }
}
