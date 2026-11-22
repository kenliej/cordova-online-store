<?php

namespace App\Http\Controllers\Api;

use App\Enums\NotificationCategory;
use App\Http\Controllers\Controller;
use App\Http\Resources\Commerce\NotificationResource;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Customer notification feed (§5): own notifications only, category + search
 * filters, sidebar counts and unread total.
 */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $category = $this->normalizeCategory($request->query('category'));
        $searchQuery = $request->query('search');
        $search = is_string($searchQuery) ? trim($searchQuery) : '';

        $query = Notification::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if ($category !== null) {
            $query->where('category', $category);
        }

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->whereLike('title', '%'.$search.'%')
                    ->orWhereLike('body', '%'.$search.'%');
            });
        }

        $notifications = $query->get();

        $countsByCategory = Notification::query()
            ->where('user_id', $user->id)
            ->selectRaw('category, COUNT(*) as aggregate')
            ->groupBy('category')
            ->pluck('aggregate', 'category');

        $counts = [
            'all' => (int) $countsByCategory->sum(),
            'offers' => (int) ($countsByCategory[NotificationCategory::Offers->value] ?? 0),
            'order' => (int) ($countsByCategory[NotificationCategory::Order->value] ?? 0),
            'system' => (int) ($countsByCategory[NotificationCategory::System->value] ?? 0),
        ];

        $unread = Notification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'data' => NotificationResource::collection($notifications)->resolve(),
            'counts' => $counts,
            'unread' => $unread,
        ]);
    }

    public function markAsRead(Request $request, Notification $notification): JsonResponse
    {
        $this->authorizeOwn($request->user(), $notification);

        if ($notification->read_at === null) {
            $notification->forceFill(['read_at' => now()])->save();
        }

        $unread = Notification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();

        return $this->ok([
            'notification' => (new NotificationResource($notification->refresh()))->resolve(),
            'unread' => $unread,
        ], 'Notification marked as read.');
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $updated = Notification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return $this->ok([
            'updated' => $updated,
            'unread' => 0,
        ], 'All notifications marked as read.');
    }

    private function authorizeOwn(User $user, Notification $notification): void
    {
        abort_unless((int) $notification->user_id === (int) $user->id, 404);
    }

    private function normalizeCategory(mixed $raw): ?string
    {
        if ($raw === null || $raw === '') {
            return null;
        }

        // A repeated/array query parameter (`?category[]=x`) is malformed input,
        // not a fatal error: reject it with a normal 422 validation response.
        if (! is_string($raw)) {
            throw ValidationException::withMessages([
                'category' => ['The selected category is invalid.'],
            ]);
        }

        $key = strtolower(trim($raw));

        $map = [
            'offers' => NotificationCategory::Offers->value,
            'offers & sales' => NotificationCategory::Offers->value,
            'offers_sales' => NotificationCategory::Offers->value,
            'order' => NotificationCategory::Order->value,
            'system' => NotificationCategory::System->value,
            'all' => null,
        ];

        if (! array_key_exists($key, $map)) {
            throw ValidationException::withMessages([
                'category' => ['The selected category is invalid.'],
            ]);
        }

        return $map[$key];
    }
}
