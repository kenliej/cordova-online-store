<?php

namespace App\Http\Resources\Catalog;

use Illuminate\Http\Request;

class StoreDetailResource extends StoreSummaryResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $images = $this->relationLoaded('images') ? $this->images : $this->images()->get();
        $highlights = $this->relationLoaded('highlights') ? $this->highlights : $this->highlights()->get();
        $products = $this->relationLoaded('products') ? $this->products : collect();

        return array_merge(parent::toArray($request), [
            'description' => $this->description,
            'images' => static::mediaUrls($images->pluck('path')),
            'highlights' => HighlightResource::collection($highlights)->resolve($request),
            'products' => ProductSummaryResource::collection($products)->resolve($request),
        ]);
    }
}
