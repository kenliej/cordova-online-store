<?php

namespace App\Http\Resources\Catalog;

use Illuminate\Http\Request;

/**
 * Worker / admin inventory payload: the catalog card fields plus the fields the
 * "Edit product" modal needs (description, category/store ids, active flag) and
 * image ids so individual existing images can be removed (remove_image_ids[]).
 */
class WorkerProductResource extends ProductSummaryResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $images = $this->relationLoaded('images') ? $this->images : $this->images()->get();

        return array_merge(parent::toArray($request), [
            'description' => $this->description,
            'category_id' => $this->category_id !== null ? (int) $this->category_id : null,
            'store_id' => $this->store_id !== null ? (int) $this->store_id : null,
            'is_active' => (bool) $this->is_active,
            'created_by' => $this->created_by !== null ? (int) $this->created_by : null,
            'image_records' => $images
                ->map(fn ($image): array => [
                    'id' => (int) $image->id,
                    'url' => static::mediaUrl($image->path),
                ])
                ->values()
                ->all(),
        ]);
    }
}
