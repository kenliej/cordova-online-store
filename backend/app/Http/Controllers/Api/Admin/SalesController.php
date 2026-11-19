<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Commerce\OrderResource;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

/**
 * Admin sales reports (§5). Date buckets follow the app timezone
 * (Asia/Manila): revenue counts orders whose created_at (dateOrdered) falls on
 * the requested day / month and whose status is claimed.
 */
class SalesController extends Controller
{
    private const STATUSES = ['claimed', 'cancelled', 'not_claimed', 'all'];

    public function summary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
        ]);

        $month = $validated['month'] ?? now()->format('Y-m');
        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth()->startOfDay();
        $end = $start->copy()->endOfMonth()->endOfDay();

        $revenue = (float) $this->window($start, $end)->where('status', 'claimed')->sum('total');
        $cancelledCount = $this->window($start, $end)->where('status', 'cancelled')->count();
        $cancelledTotal = (float) $this->window($start, $end)->where('status', 'cancelled')->sum('total');
        $notClaimedCount = $this->window($start, $end)->where('status', 'not_claimed')->count();
        $notClaimedTotal = (float) $this->window($start, $end)->where('status', 'not_claimed')->sum('total');
        $ordersCount = $this->window($start, $end)->count();

        return $this->ok([
            'month' => $month,
            'revenue' => round($revenue, 2),
            'cancelled_count' => $cancelledCount,
            'cancelled_total' => round($cancelledTotal, 2),
            'not_claimed_count' => $notClaimedCount,
            'not_claimed_total' => round($notClaimedTotal, 2),
            'orders_count' => $ordersCount,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
            'status' => ['nullable', 'string', Rule::in(self::STATUSES)],
        ]);

        $date = $validated['date'] ?? now()->toDateString();
        $status = $validated['status'] ?? 'all';

        $dayQuery = Order::query()->whereDate('created_at', $date);

        $revenue = (float) (clone $dayQuery)->where('status', 'claimed')->sum('total');
        $cancelledTotal = (float) (clone $dayQuery)->where('status', 'cancelled')->sum('total');
        $notClaimedTotal = (float) (clone $dayQuery)->where('status', 'not_claimed')->sum('total');

        if ($status !== 'all') {
            $dayQuery->where('status', $status);
        }

        $orders = $dayQuery
            ->with(['items', 'user'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return $this->ok([
            'date' => $date,
            'revenue' => round($revenue, 2),
            'cancelled_total' => round($cancelledTotal, 2),
            'not_claimed_total' => round($notClaimedTotal, 2),
            'orders' => OrderResource::collection($orders)->resolve(),
        ]);
    }

    private function window(Carbon $start, Carbon $end): Builder
    {
        return Order::query()->whereBetween('created_at', [$start, $end]);
    }
}
