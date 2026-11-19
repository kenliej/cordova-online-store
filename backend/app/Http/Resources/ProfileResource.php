<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Own profile: the canonical user payload plus ID-document metadata
 * (front/back uploaded booleans only — download URLs are admin-only).
 *
 * @mixin User
 */
class ProfileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $this->resource->loadMissing('idDocuments');

        $documents = $this->resource->idDocuments;

        return array_merge((new UserResource($this->resource))->resolve($request), [
            'id_documents' => [
                'id_front' => $documents->contains(fn ($document): bool => $document->type === 'id_front'),
                'id_back' => $documents->contains(fn ($document): bool => $document->type === 'id_back'),
            ],
        ]);
    }
}
