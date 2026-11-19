<?php

namespace App\Http\Resources\Catalog;

use Illuminate\Http\Request;

class StoreSummaryResource extends CatalogResource
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
            'category_id' => $this->category_id !== null ? (int) $this->category_id : null,
            'category' => $this->category
                ? (new CategoryResource($this->category))->resolve($request)
                : null,
            'operating_hours' => $this->operating_hours,
            'availability_label' => $this->availabilityLabel(),
            'phone' => $this->phone,
            'is_open' => (bool) $this->is_open,
            'floor_location' => $this->floor_location,
            'image_url' => static::mediaUrl($this->image_path),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
