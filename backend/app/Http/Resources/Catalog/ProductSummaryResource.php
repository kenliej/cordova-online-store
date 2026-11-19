<?php

namespace App\Http\Resources\Catalog;

use Illuminate\Http\Request;

class ProductSummaryResource extends CatalogResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $images = $this->relationLoaded('images') ? $this->images : $this->images()->get();
        $imageUrls = static::mediaUrls($images->pluck('path'));

        return [
            'id' => (int) $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'sku' => $this->sku,
            'price' => (float) $this->price,
            'original_price' => $this->original_price !== null ? (float) $this->original_price : null,
            'discount_percent' => $this->discountPercent(),
            'stock' => (int) $this->stock,
            'in_stock' => $this->isInStock(),
            'is_new' => (bool) $this->is_new,
            'image' => $imageUrls[0] ?? null,
            'images' => $imageUrls,
            'category' => $this->category
                ? (new CategoryResource($this->category))->resolve($request)
                : null,
            'store' => $this->store
                ? [
                    'id' => (int) $this->store->id,
                    'name' => $this->store->name,
                    'slug' => $this->store->slug,
                ]
                : null,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
