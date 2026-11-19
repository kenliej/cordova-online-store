<?php

namespace Tests\Feature\Orders;

use App\Models\ContactMessage;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\CommerceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommerceSeederTest extends TestCase
{
    use RefreshDatabase;

    private function seedDependencies(): User
    {
        $customer = User::factory()->create(['name' => 'Demo Customer']);
        Product::factory()->count(3)->create(['stock' => 20]);

        return $customer;
    }

    public function test_seeder_creates_demo_orders_notifications_and_contact_messages(): void
    {
        $customer = $this->seedDependencies();
        $this->seed(CommerceSeeder::class);

        $orders = Order::query()->get();
        $this->assertGreaterThanOrEqual(12, $orders->count());

        $statuses = $orders->pluck('status')->map(fn ($status) => $status->value)->unique()->values()->all();
        foreach (['pending', 'ready', 'claimed', 'cancelled', 'not_claimed'] as $expected) {
            $this->assertContains($expected, $statuses);
        }

        // Orders must be spread over today, yesterday and two days ago.
        $days = $orders->map(fn (Order $order) => $order->created_at->toDateString())->unique()->values()->all();
        $this->assertContains(now()->toDateString(), $days);
        $this->assertContains(now()->subDay()->toDateString(), $days);
        $this->assertContains(now()->subDays(2)->toDateString(), $days);

        // Line totals and order totals must agree.
        foreach ($orders as $order) {
            $items = OrderItem::query()->where('order_id', $order->id)->get();
            $this->assertGreaterThanOrEqual(1, $items->count());
            $this->assertLessThanOrEqual(3, $items->count());

            $linesTotal = round((float) $items->sum('line_total'), 2);
            $this->assertEquals($linesTotal, (float) $order->subtotal);
            $this->assertEquals($linesTotal, (float) $order->total);

            foreach ($items as $item) {
                $this->assertEquals(
                    round((float) $item->unit_price * $item->quantity, 2),
                    (float) $item->line_total,
                );
            }
        }

        // Ready / claimed / not_claimed orders carry their claim window.
        foreach ($orders->whereIn('status', ['ready', 'claimed', 'not_claimed']) as $order) {
            $this->assertNotNull($order->ready_at);
            $this->assertNotNull($order->claim_deadline);
        }

        // 5+ notifications across all three categories, some read.
        $notifications = Notification::query()->where('user_id', $customer->id)->get();
        $this->assertGreaterThanOrEqual(5, $notifications->count());
        $this->assertEqualsCanonicalizing(
            ['offers', 'order', 'system'],
            $notifications->map(fn (Notification $n) => $n->categoryValue())->unique()->values()->all(),
        );
        $this->assertGreaterThan(0, $notifications->whereNotNull('read_at')->count());

        // 2 contact messages, one still new.
        $this->assertSame(2, ContactMessage::query()->count());
        $this->assertSame(1, ContactMessage::query()->where('status', 'new')->count());
    }

    public function test_seeder_is_idempotent(): void
    {
        $this->seedDependencies();

        $this->seed(CommerceSeeder::class);
        $firstOrders = Order::query()->count();
        $firstNotifications = Notification::query()->count();
        $firstContacts = ContactMessage::query()->count();

        $this->seed(CommerceSeeder::class);

        $this->assertSame($firstOrders, Order::query()->count());
        $this->assertSame($firstNotifications, Notification::query()->count());
        $this->assertSame($firstContacts, ContactMessage::query()->count());
    }

    public function test_seeder_skips_gracefully_without_customers_or_products(): void
    {
        $this->seed(CommerceSeeder::class);

        $this->assertSame(0, Order::query()->count());
        $this->assertSame(0, Notification::query()->count());
        $this->assertSame(0, ContactMessage::query()->count());
    }
}
