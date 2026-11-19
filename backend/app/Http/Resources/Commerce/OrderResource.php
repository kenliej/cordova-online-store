<?php

namespace App\Http\Resources\Commerce;

use App\Models\Order;
use App\Models\OrderStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Canonical order serializer (customer, worker and admin sales all reuse it).
 * Relations are eager-loaded by the controllers; nothing here queries lazily.
 *
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Order $order */
        $order = $this->resource;

        $items = $order->relationLoaded('items')
            ? $order->items->map(fn ($item) => (new OrderItemResource($item))->resolve())->all()
            : [];

        return [
            'id' => (int) $order->id,
            'order_number' => $order->order_number,
            // `status` is the UI label (frontend-admin contract), `status_code`
            // is the machine value used by filters / state transitions.
            'status' => $order->statusLabel(),
            'status_label' => $order->statusLabel(),
            'status_code' => $order->statusValue(),
            'subtotal' => (float) $order->subtotal,
            'total' => (float) $order->total,
            'total_price' => (float) $order->total,
            'payment_method' => $order->payment_method,
            'payment_status' => $order->payment_status,
            'pickup_location' => $order->pickup_location,
            'notes' => $order->notes,
            'cancelled_by' => $order->cancelled_by !== null ? (int) $order->cancelled_by : null,
            'items' => $items,
            'items_count' => count($items),
            // ISO-8601 timestamps; the SPA formats them as m/d/Y for display.
            'date_ordered' => $order->created_at?->toIso8601String(),
            'date_ready' => $order->ready_at?->toIso8601String(),
            'customer' => $order->relationLoaded('user') && $order->user !== null ? [
                'id' => (int) $order->user->id,
                'name' => $order->user->name,
                'phone' => $order->user->phone,
                'customer_no' => $order->user->customer_no,
            ] : null,
            'status_histories' => $order->relationLoaded('histories')
                ? $order->histories->map(function (OrderStatusHistory $history) {
                    return [
                        'id' => (int) $history->id,
                        'from_status' => $history->from_status,
                        'to_status' => $history->to_status,
                        'changed_by' => $history->changed_by !== null ? (int) $history->changed_by : null,
                        'changed_by_name' => $history->relationLoaded('actor') ? $history->actor?->name : null,
                        'note' => $history->note,
                        'created_at' => $history->created_at?->toIso8601String(),
                    ];
                })->all()
                : null,
            'created_at' => $order->created_at?->toIso8601String(),
            'updated_at' => $order->updated_at?->toIso8601String(),
            'ready_at' => $order->ready_at?->toIso8601String(),
            'claim_deadline' => $order->claim_deadline?->toIso8601String(),
            'claimed_at' => $order->claimed_at?->toIso8601String(),
            'cancelled_at' => $order->cancelled_at?->toIso8601String(),
            'not_claimed_at' => $order->not_claimed_at?->toIso8601String(),
        ];
    }
}
