<?php

namespace App\Services;

use App\Enums\NotificationCategory;
use App\Enums\OrderStatus;
use App\Exceptions\DomainException;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Checkout (§6.4): single transaction, row-locked products, prices recomputed
 * from the database, stock re-validated, snapshots written, stock decremented,
 * purchased cart lines removed, order notification + status history created.
 */
class CheckoutService
{
    public const PICKUP_LOCATION = 'Online Mall Cordova - Pickup Counter';

    /**
     * @param  array<int, int|string>  $itemIds  only these cart rows (customer selection)
     *
     * @throws DomainException empty_cart | cart_item_invalid | product_unavailable | insufficient_stock
     */
    public function checkout(User $user, array $itemIds = [], bool $selectAll = false): Order
    {
        return DB::transaction(function () use ($user, $itemIds, $selectAll) {
            $cart = Cart::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if ($cart === null) {
                if ($itemIds !== []) {
                    throw new DomainException(
                        'Some selected cart items are invalid.',
                        'cart_item_invalid',
                        409,
                    );
                }

                throw new DomainException('Your cart is empty.', 'empty_cart', 409);
            }

            $items = $this->selectItems($cart->id, $itemIds, $selectAll);

            if ($items->isEmpty()) {
                throw new DomainException('Your cart is empty.', 'empty_cart', 409);
            }

            $productIds = $items->pluck('product_id')->map(fn ($id) => (int) $id)->unique()->sort()->values()->all();

            /** @var Collection<int, Product> $products */
            $products = Product::query()
                ->whereIn('id', $productIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $imagePaths = CommerceImageService::primaryImagePaths($productIds);

            $snapshots = [];
            $subtotal = 0.0;

            foreach ($items as $item) {
                /** @var CartItem $item */
                $product = $products->get((int) $item->product_id);
                $quantity = (int) $item->quantity;

                if ($product === null) {
                    throw new DomainException(
                        'A product in your cart is no longer available.',
                        'cart_item_invalid',
                        409,
                    );
                }

                if (! $product->is_active) {
                    throw new DomainException(
                        sprintf('"%s" is no longer available for purchase.', $product->name),
                        'product_unavailable',
                        409,
                    );
                }

                if ($quantity < 1) {
                    throw new DomainException(
                        sprintf('Invalid quantity for "%s".', $product->name),
                        'cart_item_invalid',
                        409,
                    );
                }

                if ((int) $product->stock < $quantity) {
                    throw new DomainException(
                        sprintf('Insufficient stock for "%s". Only %d left.', $product->name, (int) $product->stock),
                        'insufficient_stock',
                        409,
                    );
                }

                // Never trust client prices: the DB price is authoritative.
                $unitPrice = (float) $product->price;
                $lineTotal = round($unitPrice * $quantity, 2);
                $subtotal += $lineTotal;

                $snapshots[] = [
                    'product_id' => (int) $product->id,
                    'product_name' => $product->name,
                    'unit_price' => $unitPrice,
                    'quantity' => $quantity,
                    'line_total' => $lineTotal,
                    'image_path' => $imagePaths[(int) $product->id] ?? null,
                ];
            }

            $subtotal = round($subtotal, 2);

            $order = $this->createOrder($user, $subtotal);
            $order->items()->createMany($snapshots);

            foreach ($items as $item) {
                $product = $products->get((int) $item->product_id);
                $product->forceFill([
                    'stock' => (int) $product->stock - (int) $item->quantity,
                ])->save();
            }

            CartItem::query()->whereIn('id', $items->pluck('id')->all())->delete();

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => null,
                'to_status' => OrderStatus::Pending->value,
                'changed_by' => $user->id,
                'note' => 'Order placed.',
            ]);

            Notification::create([
                'user_id' => $user->id,
                'category' => NotificationCategory::Order->value,
                'title' => 'Order',
                'body' => sprintf(
                    'Your order %s has been placed and is pending. Total: ₱%s. We will notify you once it is ready to claim.',
                    $order->order_number,
                    number_format($subtotal, 2),
                ),
            ]);

            return $order->load(['items', 'histories.actor']);
        });
    }

    /**
     * @param  array<int, int|string>  $itemIds
     * @return Collection<int, CartItem>
     */
    private function selectItems(int $cartId, array $itemIds, bool $selectAll)
    {
        $query = CartItem::query()->where('cart_id', $cartId);

        if ($selectAll) {
            return $query->get();
        }

        if ($itemIds !== []) {
            $ids = array_values(array_unique(array_map('intval', $itemIds)));

            $items = $query->whereIn('id', $ids)->get();

            if ($items->count() !== count($ids)) {
                throw new DomainException(
                    'Some selected cart items are invalid.',
                    'cart_item_invalid',
                    409,
                );
            }

            return $items;
        }

        // No explicit selection: fall back to the persisted is_selected flags.
        return $query->where('is_selected', true)->get();
    }

    private function createOrder(User $user, float $total): Order
    {
        $year = now()->format('Y');
        $sequence = (int) (Order::query()->max('id') ?? 0);

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $sequence++;
            $orderNumber = sprintf('OM-%s-%06d', $year, $sequence);

            try {
                return Order::create([
                    'order_number' => $orderNumber,
                    'user_id' => $user->id,
                    'status' => OrderStatus::Pending->value,
                    'subtotal' => $total,
                    'total' => $total,
                    'payment_method' => 'pay_at_mall',
                    'payment_status' => 'unpaid',
                    'pickup_location' => self::PICKUP_LOCATION,
                ]);
            } catch (QueryException $e) {
                if (! $this->isUniqueViolation($e)) {
                    throw $e;
                }
            }
        }

        throw new DomainException('Could not place the order, please try again.', 'checkout_failed', 409);
    }

    private function isUniqueViolation(QueryException $e): bool
    {
        $sqlState = $e->errorInfo[0] ?? null;

        if (in_array($sqlState, ['23000', '23505'], true) && str_contains(strtolower($e->getMessage()), 'order_number')) {
            return true;
        }

        return str_contains(strtolower($e->getMessage()), 'unique constraint') && str_contains(strtolower($e->getMessage()), 'order_number');
    }
}
