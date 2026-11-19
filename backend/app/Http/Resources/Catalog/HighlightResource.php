<?php

namespace App\Http\Resources\Catalog;

use Illuminate\Http\Request;

/**
 * Shared {id,title,body} shape for product_highlights / store_highlights.
 */
class HighlightResource extends CatalogResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'title' => $this->title,
            'body' => $this->body,
            'sort_order' => (int) $this->sort_order,
        ];
    }
}
