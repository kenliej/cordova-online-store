<?php

namespace App\Http\Resources\Commerce;

use App\Models\CartItem;
use App\Services\CommerceImageService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Cart line payload. `title` / `price` / `image` mirror the legacy UI field
 * names; `product_name` / `unit_price` are the canonical snake_case fields.
 *
 * @mixin CartItem
 */
class CartItemResource extends JsonResource
{
    public function __construct(CartItem $resource, protected ?string $imagePath = null)
    {
        parent::__construct($resource);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var CartItem $item */
        $item = $this->resource;
        $product = $item->relationLoaded('product') ? $item->getRelation('product') : null;

        $unitPrice = $product !== null ? (float) $product->price : 0.0;
        $quantity = (int) $item->quantity;
        $stock = $product !== null ? (int) $product->stock : 0;
        $image = CommerceImageService::url($this->imagePath);

        $productName = $product?->name;

        return [
            'id' => (int) $item->id,
            'product_id' => (int) $item->product_id,
            'title' => $productName,
            'product_name' => $productName,
            'slug' => $product?->slug,
            'unit_price' => $unitPrice,
            'price' => $unitPrice,
            'quantity' => $quantity,
            'line_total' => round($unitPrice * $quantity, 2),
            'image' => $image,
            'image_path' => $this->imagePath,
            'stock' => $stock,
            'is_selected' => (bool) $item->is_selected,
            'is_available' => $product !== null && (bool) $product->is_active && $stock >= $quantity,
            'product' => $product === null ? null : [
                'id' => (int) $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'price' => (float) $product->price,
                'original_price' => $product->original_price !== null ? (float) $product->original_price : null,
                'stock' => $stock,
                'is_new' => (bool) $product->is_new,
                'is_active' => (bool) $product->is_active,
                'store_id' => $product->store_id !== null ? (int) $product->store_id : null,
                'category_id' => $product->category_id !== null ? (int) $product->category_id : null,
                'image' => $image,
                'image_path' => $this->imagePath,
            ],
            'created_at' => $item->created_at?->toIso8601String(),
        ];
    }
}
