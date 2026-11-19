<?php

namespace Database\Seeders;

use App\Models\ContactMessage;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Services\CommerceImageService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Demo commerce data (§12): orders spread over today / -1 / -2 days covering
 * every status, notifications for the demo customers, and contact messages.
 *
 * Depends on UserSeeder + CatalogSeeder having run first; degrades gracefully
 * (warns and skips) when those tables are empty. Idempotent on natural keys:
 * order_number, notification title per user, contact e-mail+subject.
 */
class CommerceSeeder extends Seeder
{
    /**
     * Demo order blueprint: [status, days_ago, quantities per item].
     *
     * @var array<int, array{status: string, days_ago: int, quantities: array<int, int>}>
     */
    private const ORDERS = [
        ['status' => 'pending', 'days_ago' => 0, 'quantities' => [1, 2]],
        ['status' => 'pending', 'days_ago' => 0, 'quantities' => [1]],
        ['status' => 'ready', 'days_ago' => 0, 'quantities' => [1, 1]],
        ['status' => 'ready', 'days_ago' => 0, 'quantities' => [2]],
        ['status' => 'claimed', 'days_ago' => 0, 'quantities' => [1]],
        ['status' => 'claimed', 'days_ago' => 1, 'quantities' => [1, 3]],
        ['status' => 'claimed', 'days_ago' => 1, 'quantities' => [2]],
        ['status' => 'cancelled', 'days_ago' => 1, 'quantities' => [1]],
        ['status' => 'ready', 'days_ago' => 1, 'quantities' => [1, 1]],
        ['status' => 'claimed', 'days_ago' => 2, 'quantities' => [3]],
        ['status' => 'cancelled', 'days_ago' => 2, 'quantities' => [1, 2]],
        ['status' => 'not_claimed', 'days_ago' => 2, 'quantities' => [1]],
        ['status' => 'pending', 'days_ago' => 2, 'quantities' => [2, 1]],
    ];

    public function run(): void
    {
        $customers = User::query()
            ->where('role', 'customer')
            ->where('status', 'active')
            ->orderBy('id')
            ->get();

        $products = Product::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->take(40)
            ->get();

        if ($customers->isEmpty()) {
            $this->command?->warn('CommerceSeeder skipped: no active customers found (run UserSeeder first).');

            return;
        }

        if ($products->isEmpty()) {
            $this->command?->warn('CommerceSeeder skipped: no active products found (run CatalogSeeder first).');

            return;
        }

        $createdOrders = $this->seedOrders($customers, $products);
        $this->seedNotifications($customers);
        $this->seedContactMessages();

        $this->command?->info(sprintf(
            'CommerceSeeder: %d demo orders, demo notifications and 2 contact messages ensured.',
            $createdOrders,
        ));
    }

    /**
     * @param  Collection<int, User>  $customers
     * @param  Collection<int, Product>  $products
     */
    private function seedOrders($customers, $products): int
    {
        $created = 0;

        foreach (self::ORDERS as $index => $blueprint) {
            $number = sprintf('OM-DEMO-%04d', $index + 1);

            $existing = Order::query()->where('order_number', $number)->exists();

            if ($existing) {
                continue;
            }

            $customer = $customers[$index % $customers->count()];

            $createdAt = Carbon::now()
                ->subDays($blueprint['days_ago'])
                ->setTime(9 + ($index % 9), ($index * 7) % 60, 0);

            $itemProducts = collect($blueprint['quantities'])
                ->map(fn (int $quantity, int $offset) => [
                    'product' => $products[($index * 3 + $offset) % $products->count()],
                    'quantity' => $quantity,
                ]);

            $subtotal = 0.0;
            $rows = [];

            foreach ($itemProducts as $line) {
                /** @var Product $product */
                $product = $line['product'];
                $quantity = (int) $line['quantity'];
                $unitPrice = (float) $product->price;
                $lineTotal = round($unitPrice * $quantity, 2);
                $subtotal += $lineTotal;

                $rows[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'unit_price' => $unitPrice,
                    'quantity' => $quantity,
                    'line_total' => $lineTotal,
                    'image_path' => CommerceImageService::primaryImagePath((int) $product->id),
                ];
            }

            $subtotal = round($subtotal, 2);
            $timestamps = $this->timestampsFor($blueprint['status'], $createdAt);

            /** @var Order $order */
            $order = Order::query()->create([
                'order_number' => $number,
                'user_id' => $customer->id,
                'status' => $blueprint['status'],
                'subtotal' => $subtotal,
                'total' => $subtotal,
                'payment_method' => 'pay_at_mall',
                'payment_status' => $blueprint['status'] === 'claimed' ? 'paid' : 'unpaid',
                'pickup_location' => 'Online Mall Cordova - Pickup Counter',
                'notes' => null,
                'ready_at' => $timestamps['ready_at'],
                'claim_deadline' => $timestamps['claim_deadline'],
                'claimed_at' => $timestamps['claimed_at'],
                'cancelled_at' => $timestamps['cancelled_at'],
                'not_claimed_at' => $timestamps['not_claimed_at'],
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            foreach ($rows as $row) {
                OrderItem::query()->create($row + ['order_id' => $order->id]);
            }

            $created++;
        }

        return $created;
    }

    /**
     * @return array{ready_at: ?Carbon, claim_deadline: ?Carbon, claimed_at: ?Carbon, cancelled_at: ?Carbon, not_claimed_at: ?Carbon}
     */
    private function timestampsFor(string $status, Carbon $createdAt): array
    {
        $base = [
            'ready_at' => null,
            'claim_deadline' => null,
            'claimed_at' => null,
            'cancelled_at' => null,
            'not_claimed_at' => null,
        ];

        switch ($status) {
            case 'ready':
                $base['ready_at'] = $createdAt->copy()->addHours(2);
                $base['claim_deadline'] = $createdAt->copy()->addHours(2)->addDays(3);
                break;
            case 'claimed':
                $base['ready_at'] = $createdAt->copy()->addHours(2);
                $base['claim_deadline'] = $createdAt->copy()->addHours(2)->addDays(3);
                $base['claimed_at'] = $createdAt->copy()->addHours(30);
                break;
            case 'cancelled':
                $base['cancelled_at'] = $createdAt->copy()->addMinutes(45);
                break;
            case 'not_claimed':
                $base['ready_at'] = $createdAt->copy()->addHours(2);
                $base['claim_deadline'] = $createdAt->copy()->addHours(2)->addDays(3);
                $base['not_claimed_at'] = $createdAt->copy()->addHours(2)->addDays(3)->addHours(2);
                break;
        }

        return $base;
    }

    /**
     * @param  Collection<int, User>  $customers
     */
    private function seedNotifications($customers): void
    {
        $templates = [
            ['offers', 'Flash sale', 'Up to 50% off select brands, plus 50% off all store brands this weekend!', false],
            ['offers', 'Discount Reminder', 'Your exclusive mall-wide discount ends tonight. Shop now and pay at the mall.', true],
            ['offers', 'New arrivals', 'Fresh finds just landed from your favorite Cordova stores.', false],
            ['order', 'Order', 'order pending — we will let you know as soon as it is ready to claim.', true],
            ['order', 'Order Ready', 'Your order is ready to claim at the Online Mall Cordova pickup counter.', false],
            ['system', 'New Update ver 1.1', 'The Online Mall Cordova app now shows claim deadlines and unread notifications.', false],
            ['system', 'Account Approved', 'Your account is active. You can now shop online and pick up at the mall.', true],
        ];

        foreach ($customers as $customer) {
            foreach ($templates as $offset => [$category, $title, $body, $isRead]) {
                Notification::query()->firstOrCreate(
                    [
                        'user_id' => $customer->id,
                        'title' => $title,
                        'category' => $category,
                    ],
                    [
                        'body' => $body,
                        'read_at' => $isRead ? Carbon::now()->subDays(3)->setTime(10, 0, 0) : null,
                        'created_at' => Carbon::now()->subDays(2)->subMinutes(($offset + 1) * 13),
                        'updated_at' => Carbon::now()->subDays(2),
                    ],
                );
            }
        }
    }

    private function seedContactMessages(): void
    {
        ContactMessage::query()->firstOrCreate(
            ['email' => 'maria.santos@example.com', 'subject' => 'Inquiry about store operating hours'],
            [
                'name' => 'Maria Santos',
                'phone' => '09171234567',
                'message' => 'Hi! What time does the pickup counter open on Sundays? Thank you.',
                'status' => 'new',
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ],
        );

        ContactMessage::query()->firstOrCreate(
            ['email' => 'juan.dela.cruz@example.com', 'subject' => 'Report a missing order item'],
            [
                'name' => 'Juan Dela Cruz',
                'phone' => '09181234567',
                'message' => 'One item from my order was missing when I claimed it. Please help.',
                'status' => 'replied',
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
            ],
        );
    }
}
