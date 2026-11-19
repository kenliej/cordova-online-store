<?php

namespace App\Http\Resources;

use App\Models\IdDocument;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Metadata for a single private ID scan. Never exposes the storage path; the
 * file is only reachable through the authorized download route.
 *
 * @mixin IdDocument
 */
class IdDocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'original_name' => $this->original_name,
            'mime' => $this->mime,
            'size_bytes' => $this->size_bytes,
            'created_at' => $this->created_at?->toIso8601String(),
            'download_url' => url('/api/profile/id-documents/'.$this->getKey()),
        ];
    }
}
