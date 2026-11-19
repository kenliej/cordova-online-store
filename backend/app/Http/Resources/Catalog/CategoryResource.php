<?php

namespace App\Http\Resources\Catalog;

use Illuminate\Http\Request;

class CategoryResource extends CatalogResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'type' => $this->type,
            'parent_id' => $this->parent_id !== null ? (int) $this->parent_id : null,
            'display_name' => $this->displayName(),
            'sort_order' => (int) $this->sort_order,
        ];
    }
}
