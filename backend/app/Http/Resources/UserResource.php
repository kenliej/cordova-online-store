<?php

namespace App\Http\Resources;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Canonical account serializer (never exposes password/remember_token or ID
 * document paths). Used by auth, profile and admin endpoints.
 *
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => $this->role instanceof UserRole ? $this->role->value : $this->role,
            'status' => $this->status instanceof UserStatus ? $this->status->value : $this->status,
            'customer_no' => $this->customer_no,
            'worker_no' => $this->worker_no,
            'gender' => $this->gender,
            'birthday' => $this->birthday?->toDateString(),
            'address' => $this->address,
            'profile_photo_url' => $this->profile_photo_url,
            'bad_records' => (int) $this->bad_records,
            'store_id' => $this->store_id,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'id_documents_count' => $this->whenCounted('idDocuments'),
        ];
    }
}
