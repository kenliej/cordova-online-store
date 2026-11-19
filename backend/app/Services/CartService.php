<?php

namespace App\Services;

use App\Http\Resources\Commerce\CartItemResource;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Cart persistence + payload assembly. Kept out of the controller so checkout
 * and cart endpoints share one canonical JSON shape.
 */
class CartService
{
    /** Get or create the authenticated customer's single cart. */
    public function cartFor(User $user): Cart
    {
        return Cart::query()->firstOrCreate(['user_id' => $user->id]);
    }

    /**
     * Canonical cart payload: { items: [...], summary: {selected_count,total,item_count} }.
     *
     * @return array<string, mixed>
     */
    public function payload(Cart $cart): array
    {
        $cart->loadMissing(['items.product']);

        /** @var Collection<int, CartItem> $items */
        $items = $cart->items->sortBy('id')->values();
        $imagePaths = CommerceImageService::primaryImagePaths($items->pluck('product_id')->all());

        $serialized = $items->map(function (CartItem $item) use ($imagePaths) {
            return (new CartItemResource($item, $imagePaths[$item->product_id] ?? null))->resolve();
        })->all();

        return [
            'items' => $serialized,
            'summary' => $this->summary($items),
        ];
    }

    /**
     * @param  Collection<int, CartItem>  $items
     * @return array{selected_count: int, total: float, item_count: int}
     */
    public function summary($items): array
    {
        $selectedCount = 0;
        $total = 0.0;

        foreach ($items as $item) {
            if (! $item->is_selected) {
                continue;
            }

            $product = $item->relationLoaded('product') ? $item->getRelation('product') : null;
            $unitPrice = $product !== null ? (float) $product->price : 0.0;

            $selectedCount += (int) $item->quantity;
            $total += $unitPrice * (int) $item->quantity;
        }

        return [
            'selected_count' => $selectedCount,
            'total' => round($total, 2),
            'item_count' => $items->count(),
        ];
    }
}
