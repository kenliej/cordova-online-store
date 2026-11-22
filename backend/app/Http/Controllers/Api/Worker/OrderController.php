<?php

namespace App\Http\Controllers\Api\Worker;

use App\Http\Controllers\Controller;
use App\Http\Requests\Order\WorkerOrderStatusRequest;
use App\Http\Resources\Commerce\OrderResource;
use App\Models\Order;
use App\Services\OrderStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Worker order desk (§5): list/search/see all orders, move them through the
 * state machine (service enforces transitions + side effects).
 */
class OrderController extends Controller
{
    public function __construct(private readonly OrderStatusService $statuses) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', Rule::in(['pending', 'ready', 'claimed', 'cancelled', 'not_claimed', 'active', 'history', 'all'])],
            'search' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Order::query()->with(['items', 'user']);

        $status = $validated['status'] ?? 'all';

        match ($status) {
            'active' => $query->active(),
            'history' => $query->history(),
            'all' => null,
            default => $query->where('status', $status),
        };

        $search = trim((string) ($validated['search'] ?? ''));

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->whereLike('order_number', '%'.$search.'%')
                    ->orWhereHas('user', fn ($userQuery) => $userQuery->whereLike('name', '%'.$search.'%'));
            });
        }

        $paginator = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate((int) ($validated['per_page'] ?? 20))
            ->withQueryString();

        return $this->paginated(
            $paginator,
            OrderResource::collection($paginator->getCollection())->resolve(),
        );
    }

    public function show(Order $order): JsonResponse
    {
        $order->load(['items', 'histories.actor', 'user']);

        return $this->ok((new OrderResource($order))->resolve());
    }

    public function updateStatus(WorkerOrderStatusRequest $request, Order $order): JsonResponse
    {
        $order = $this->statuses->transition(
            $order,
            (string) $request->input('status'),
            $request->user(),
            $request->filled('note') ? (string) $request->input('note') : null,
        );

        return $this->ok((new OrderResource($order))->resolve(), 'Order status updated.');
    }
}
