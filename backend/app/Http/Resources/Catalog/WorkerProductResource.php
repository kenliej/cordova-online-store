<?php

namespace App\Http\Resources\Catalog;

use Illuminate\Http\Request;

/**
 * Worker / admin inventory payload: the catalog card fields plus the fields the
 * "Edit product" modal needs (description, category/store ids, active flag).
 */
class WorkerProductResource extends ProductSummaryResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return array_merge(parent::toArray($request), [
            'description' => $this->description,
            'category_id' => $this->category_id !== null ? (int) $this->category_id : null,
            'store_id' => $this->store_id !== null ? (int) $this->store_id : null,
            'is_active' => (bool) $this->is_active,
            'created_by' => $this->created_by !== null ? (int) $this->created_by : null,
        ]);
    }
}
