<?php

namespace App\Http\Resources\Commerce;

use App\Models\OrderItem;
use App\Services\CommerceImageService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Immutable order line payload. Prices are snapshots taken at checkout.
 *
 * @mixin OrderItem
 */
class OrderItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var OrderItem $item */
        $item = $this->resource;
        $unitPrice = (float) $item->unit_price;
        $quantity = (int) $item->quantity;

        return [
            'id' => (int) $item->id,
            'product_id' => $item->product_id !== null ? (int) $item->product_id : null,
            'product_name' => $item->product_name,
            'title' => $item->product_name,
            'unit_price' => $unitPrice,
            'price' => $unitPrice,
            'quantity' => $quantity,
            'line_total' => (float) $item->line_total,
            'image_path' => $item->image_path,
            'image' => CommerceImageService::url($item->image_path),
        ];
    }
}
