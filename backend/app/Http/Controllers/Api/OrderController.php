<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Commerce\OrderResource;
use App\Models\Order;
use App\Models\User;
use App\Services\OrderStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Customer order history (§5): own orders only; cross-user access → 404.
 */
class OrderController extends Controller
{
    public function __construct(private readonly OrderStatusService $statuses) {}

    private const FILTERS = [
        'all',
        'active',
        'history',
        'pending',
        'ready',
        'claimed',
        'cancelled',
        'not_claimed',
    ];

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', Rule::in(self::FILTERS)],
        ]);

        /** @var User $user */
        $user = $request->user();
        $status = $validated['status'] ?? 'all';

        $query = Order::query()
            ->with('items')
            ->where('user_id', $user->id);

        match ($status) {
            'active' => $query->active(),
            'history' => $query->history(),
            'all' => null,
            default => $query->where('status', $status),
        };

        $orders = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return $this->ok(OrderResource::collection($orders)->resolve());
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        abort_unless($request->user()->can('view', $order), 404);

        $order->load(['items', 'histories.actor', 'user']);

        return $this->ok((new OrderResource($order))->resolve());
    }

    public function cancel(Request $request, Order $order): JsonResponse
    {
        abort_unless($request->user()->can('cancel', $order), 404);

        $order = $this->statuses->transition(
            $order,
            OrderStatus::Cancelled,
            $request->user(),
            'Cancelled by customer.',
        );

        return $this->ok((new OrderResource($order))->resolve(), 'Order cancelled.');
    }
}
