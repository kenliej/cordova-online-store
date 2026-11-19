<?php

namespace App\Services;

use App\Enums\NotificationCategory;
use App\Enums\OrderStatus;
use App\Enums\UserStatus;
use App\Exceptions\DomainException;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;

/**
 * The only place order statuses may change (§6.3–§6.6).
 *
 * State machine: pending → ready | cancelled; ready → claimed | not_claimed;
 * terminal states are immutable. Terminal transitions restore stock exactly
 * once (guarded by the lock + valid transition), write a history row, notify
 * the customer and audit privileged actions.
 */
class OrderStatusService
{
    public const CLAIM_WINDOW_DAYS = 3;

    /** Transition target labels used in history notes / notifications. */
    private const NOTES = [
        'ready' => 'Order marked as ready to claim.',
        'claimed' => 'Order claimed by customer.',
        'cancelled' => 'Order cancelled.',
        'not_claimed' => 'Order was not claimed within the pickup window.',
    ];

    /**
     * @param  User|null  $actor  null for system-triggered transitions (scheduler)
     */
    public function transition(Order $order, OrderStatus|string $target, ?User $actor = null, ?string $note = null): Order
    {
        $targetStatus = $target instanceof OrderStatus ? $target : OrderStatus::from($target);

        return DB::transaction(function () use ($order, $targetStatus, $actor, $note) {
            /** @var Order $locked */
            $locked = Order::query()->whereKey($order->getKey())->lockForUpdate()->firstOrFail();

            $from = $locked->status instanceof OrderStatus
                ? $locked->status
                : OrderStatus::from((string) $locked->status);

            if (! $from->canTransitionTo($targetStatus)) {
                throw DomainException::invalidState(sprintf(
                    'Cannot change order status from "%s" to "%s".',
                    $from->value,
                    $targetStatus->value,
                ));
            }

            $now = now();
            $attributes = ['status' => $targetStatus->value];

            switch ($targetStatus) {
                case OrderStatus::Ready:
                    $attributes['ready_at'] = $now;
                    $attributes['claim_deadline'] = $now->copy()->addDays(self::CLAIM_WINDOW_DAYS);
                    break;
                case OrderStatus::Claimed:
                    $attributes['claimed_at'] = $now;
                    $attributes['payment_status'] = 'paid';
                    break;
                case OrderStatus::Cancelled:
                    $attributes['cancelled_at'] = $now;
                    $attributes['cancelled_by'] = $actor?->id;
                    break;
                case OrderStatus::NotClaimed:
                    $attributes['not_claimed_at'] = $now;
                    break;
                default:
                    throw DomainException::invalidState('Unsupported order status transition.');
            }

            $locked->forceFill($attributes)->save();

            // Stock was reserved at checkout, so it must be returned exactly
            // once whenever an order leaves the reserved (pending/ready) state.
            if (in_array($targetStatus, [OrderStatus::Cancelled, OrderStatus::NotClaimed], true)) {
                $this->restoreStock($locked);
            }

            $penalty = $targetStatus === OrderStatus::NotClaimed
                ? $this->applyNotClaimedPenalty($locked, $actor)
                : null;

            $this->recordHistory($locked, $from, $targetStatus, $actor, $note);
            $this->notifyCustomer($locked, $targetStatus, $penalty);

            AuditLogger::log('order.status_changed', $locked, [
                'from' => $from->value,
                'to' => $targetStatus->value,
                'note' => $note,
                'system' => $actor === null,
            ], $actor?->id);

            return $locked->load(['items', 'histories.actor', 'user']);
        });
    }

    /**
     * System path (scheduler / console command): mark an overdue ready order as
     * not claimed without a human actor. The customer notification and bad-record
     * penalty still apply; history/audit rows record a null actor.
     */
    public function markNotClaimedBySystem(Order $order, ?string $note = null): Order
    {
        return $this->transition(
            $order,
            OrderStatus::NotClaimed,
            null,
            $note ?? 'Automatically marked as not claimed: claim deadline passed.',
        );
    }

    /** Return reserved quantities to the catalog (works even for soft-deleted products). */
    private function restoreStock(Order $order): void
    {
        $order->loadMissing('items');

        foreach ($order->items as $item) {
            if ($item->product_id === null) {
                continue;
            }

            DB::table('products')
                ->where('id', $item->product_id)
                ->increment('stock', (int) $item->quantity);
        }
    }

    /**
     * bad_records += 1; at >= 2 the account is banned and existing sessions /
     * API tokens are revoked (§6.6–§6.7).
     *
     * @return array{bad_records: int, banned: bool}|null
     */
    private function applyNotClaimedPenalty(Order $order, ?User $actor): ?array
    {
        /** @var User|null $customer */
        $customer = User::query()->whereKey($order->user_id)->lockForUpdate()->first();

        if ($customer === null) {
            return null;
        }

        $badRecords = (int) ($customer->bad_records ?? 0) + 1;
        $customer->forceFill(['bad_records' => $badRecords])->save();

        $banned = false;

        if ($badRecords >= 2 && $this->userStatusValue($customer) !== UserStatus::Banned->value) {
            $customer->forceFill(['status' => UserStatus::Banned->value])->save();
            $this->revokeAccess($customer);
            $banned = true;

            Notification::create([
                'user_id' => $customer->id,
                'category' => NotificationCategory::System->value,
                'title' => 'Account Banned',
                'body' => 'Your account has been banned because two orders were not claimed within the pickup window.',
            ]);

            AuditLogger::log('customer.banned', $customer, [
                'reason' => 'bad_records',
                'bad_records' => $badRecords,
                'order_id' => $order->id,
            ], $actor?->id);
        }

        return ['bad_records' => $badRecords, 'banned' => $banned];
    }

    /** Kill every existing login for a banned account (sessions + Sanctum tokens). */
    private function revokeAccess(User $customer): void
    {
        try {
            DB::table('sessions')->where('user_id', $customer->id)->delete();
        } catch (\Throwable) {
            // Sessions table not migrated yet (parallel module) — ignore.
        }

        try {
            DB::table('personal_access_tokens')
                ->where('tokenable_type', $customer::class)
                ->where('tokenable_id', $customer->id)
                ->delete();
        } catch (\Throwable) {
            // Tokens table not migrated yet — ignore.
        }
    }

    private function recordHistory(Order $order, OrderStatus $from, OrderStatus $to, ?User $actor, ?string $note): void
    {
        OrderStatusHistory::create([
            'order_id' => $order->id,
            'from_status' => $from->value,
            'to_status' => $to->value,
            'changed_by' => $actor?->id,
            'note' => $note ?? self::NOTES[$to->value] ?? null,
        ]);
    }

    /**
     * @param  array{bad_records: int, banned: bool}|null  $penalty
     */
    private function notifyCustomer(Order $order, OrderStatus $to, ?array $penalty): void
    {
        if ($order->user_id === null) {
            return;
        }

        [$title, $body] = match ($to) {
            OrderStatus::Ready => [
                'Order Ready',
                sprintf(
                    'Your order %s is ready to claim at %s. Please claim it on or before %s.',
                    $order->order_number,
                    $order->pickup_location,
                    $order->claim_deadline?->format('M d, Y g:i A') ?? now()->addDays(self::CLAIM_WINDOW_DAYS)->format('M d, Y g:i A'),
                ),
            ],
            OrderStatus::Claimed => [
                'Order Claimed',
                sprintf('Your order %s has been claimed. Thank you for shopping with Online Mall Cordova!', $order->order_number),
            ],
            OrderStatus::Cancelled => [
                'Order Cancelled',
                sprintf('Your order %s has been cancelled. Any reserved items have been returned to stock.', $order->order_number),
            ],
            OrderStatus::NotClaimed => [
                'Order Not Claimed',
                sprintf(
                    'Your order %s was not claimed within the pickup window. This has been recorded as a bad record (%d/2).%s',
                    $order->order_number,
                    $penalty['bad_records'] ?? 1,
                    ($penalty['banned'] ?? false) ? ' Your account has been banned.' : '',
                ),
            ],
            default => [null, null],
        };

        if ($title === null || $body === null) {
            return;
        }

        Notification::create([
            'user_id' => $order->user_id,
            'category' => NotificationCategory::Order->value,
            'title' => $title,
            'body' => $body,
        ]);
    }

    private function userStatusValue(User $user): string
    {
        $status = $user->status ?? null;

        if ($status instanceof \BackedEnum) {
            return (string) $status->value;
        }

        return (string) $status;
    }
}
