<?php

namespace App\Console\Commands;

use App\Enums\OrderStatus;
use App\Exceptions\DomainException;
use App\Models\Order;
use App\Services\OrderStatusService;
use Illuminate\Console\Command;

/**
 * Hourly scheduler job (registered by the Lead in routes/console.php):
 * transitions overdue `ready` orders to `not_claimed`, which restores stock,
 * increments the customer's bad_records, auto-bans at 2 and notifies them.
 *
 * Safe to run concurrently: every transition re-locks the order and re-checks
 * the state machine, so an order already handled by a worker is skipped.
 */
class MarkOverdueOrdersUnclaimed extends Command
{
    protected $signature = 'orders:mark-unclaimed {--limit=200 : Maximum number of orders to process in this run}';

    protected $description = 'Mark ready orders past their claim deadline as not claimed';

    public function handle(OrderStatusService $statuses): int
    {
        $limit = max(1, (int) $this->option('limit'));

        $orderIds = Order::query()
            ->where('status', OrderStatus::Ready->value)
            ->whereNotNull('claim_deadline')
            ->where('claim_deadline', '<', now())
            ->orderBy('claim_deadline')
            ->limit($limit)
            ->pluck('id');

        $marked = 0;
        $skipped = 0;

        foreach ($orderIds as $orderId) {
            $order = Order::query()->find($orderId);

            if ($order === null) {
                $skipped++;

                continue;
            }

            try {
                $order = $statuses->markNotClaimedBySystem(
                    $order,
                    'Automatically marked as not claimed: claim deadline passed.',
                );
            } catch (DomainException) {
                // A worker changed the order between the scan and the lock.
                $skipped++;

                continue;
            }

            $marked++;
            $this->line(sprintf('Order %s marked as not claimed.', $order->order_number));
        }

        $this->info(sprintf(
            'Marked %d overdue order(s) as not claimed (%d skipped).',
            $marked,
            $skipped,
        ));

        return self::SUCCESS;
    }
}
