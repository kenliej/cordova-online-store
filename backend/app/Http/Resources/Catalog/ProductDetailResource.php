<?php

namespace App\Http\Resources\Catalog;

use Illuminate\Http\Request;

class ProductDetailResource extends ProductSummaryResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $highlights = $this->relationLoaded('highlights') ? $this->highlights : $this->highlights()->get();
        $related = $this->relationLoaded('related') ? $this->related : collect();

        return array_merge(parent::toArray($request), [
            'description' => $this->description,
            'category_id' => $this->category_id !== null ? (int) $this->category_id : null,
            'store_id' => $this->store_id !== null ? (int) $this->store_id : null,
            'highlights' => HighlightResource::collection($highlights)->resolve($request),
            'related' => ProductSummaryResource::collection($related)->resolve($request),
        ]);
    }
}
