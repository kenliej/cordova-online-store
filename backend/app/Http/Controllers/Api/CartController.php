<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Cart\StoreCartItemRequest;
use App\Http\Requests\Cart\UpdateCartItemRequest;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Customer cart (§5). Every query is scoped to the authenticated customer's
 * cart; another user's item resolves to 404 (never 403 — §6.1).
 */
class CartController extends Controller
{
    public function __construct(private readonly CartService $carts) {}

    public function show(Request $request): JsonResponse
    {
        $cart = $this->carts->cartFor($request->user());

        return $this->ok($this->carts->payload($cart));
    }

    public function store(StoreCartItemRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $product = $this->findProduct((int) $request->integer('product_id'));

        if (! $product->is_active) {
            throw new DomainException('This product is not available.', 'product_unavailable', 409);
        }

        $quantity = (int) $request->integer('quantity', 1);
        $cart = $this->carts->cartFor($user);

        /** @var CartItem|null $item */
        $item = CartItem::query()
            ->where('cart_id', $cart->id)
            ->where('product_id', $product->id)
            ->first();

        $newQuantity = ($item?->quantity ?? 0) + $quantity;
        $stock = (int) $product->stock;

        if ($newQuantity > $stock) {
            throw new DomainException(
                sprintf('Insufficient stock for "%s". Only %d left.', $product->name, $stock),
                'insufficient_stock',
                409,
            );
        }

        $created = false;

        if ($item === null) {
            $item = CartItem::create([
                'cart_id' => $cart->id,
                'product_id' => $product->id,
                'quantity' => $newQuantity,
                'is_selected' => true,
            ]);
            $created = true;
        } else {
            $item->forceFill(['quantity' => $newQuantity, 'is_selected' => true])->save();
        }

        return $this->ok(
            $this->payloadWithItem($cart->refresh(), (int) $item->id),
            'Added to cart.',
            $created ? 201 : 200,
        );
    }

    public function update(UpdateCartItemRequest $request, CartItem $item): JsonResponse
    {
        $this->authorizeItem($request->user(), $item);

        if ($request->filled('quantity')) {
            $quantity = (int) $request->integer('quantity');
            $product = $item->product;

            if ($product === null) {
                throw new DomainException('This product is no longer available.', 'product_unavailable', 409);
            }

            if (! $product->is_active) {
                throw new DomainException('This product is not available.', 'product_unavailable', 409);
            }

            $stock = (int) $product->stock;

            if ($quantity > $stock) {
                throw new DomainException(
                    sprintf('Insufficient stock for "%s". Only %d left.', $product->name, $stock),
                    'insufficient_stock',
                    409,
                );
            }

            $item->quantity = $quantity;
        }

        if ($request->filled('is_selected')) {
            $item->is_selected = $request->boolean('is_selected');
        }

        $item->save();

        $cart = $item->cart()->firstOrFail();

        return $this->ok($this->payloadWithItem($cart, (int) $item->id), 'Cart updated.');
    }

    public function destroy(Request $request, CartItem $item): Response
    {
        $this->authorizeItem($request->user(), $item);

        $item->delete();

        return response()->noContent();
    }

    public function clear(Request $request): JsonResponse
    {
        $cart = $this->carts->cartFor($request->user());
        $query = CartItem::query()->where('cart_id', $cart->id);

        if ($request->boolean('selected')) {
            $query->where('is_selected', true);
        }

        $query->delete();

        $payload = $this->carts->payload($cart->refresh());

        return $this->ok($payload, 'Cart cleared.');
    }

    private function findProduct(int $productId): Product
    {
        /** @var Product|null $product */
        $product = Product::query()->find($productId);

        if ($product === null) {
            throw new DomainException('Product not found.', 'product_not_found', 404);
        }

        return $product;
    }

    private function authorizeItem(User $user, CartItem $item): void
    {
        $owned = CartItem::query()
            ->whereKey($item->getKey())
            ->whereHas('cart', fn ($query) => $query->where('user_id', $user->id))
            ->exists();

        abort_unless($owned, 404);
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadWithItem(Cart $cart, int $itemId): array
    {
        $payload = $this->carts->payload($cart);
        $payload['item'] = collect($payload['items'])->firstWhere('id', $itemId);

        return $payload;
    }
}
