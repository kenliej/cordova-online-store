<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Store;
use App\Models\User;

class StorePolicy
{
    public function viewAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function view(User $user, Store $store): bool
    {
        return $this->isAdmin($user);
    }

    public function create(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function update(User $user, Store $store): bool
    {
        return $this->isAdmin($user);
    }

    public function delete(User $user, Store $store): bool
    {
        return $this->isAdmin($user);
    }

    public function restore(User $user, Store $store): bool
    {
        return $this->isAdmin($user);
    }

    private function isAdmin(User $user): bool
    {
        $role = $user->role;

        if ($role instanceof UserRole) {
            return $role === UserRole::Admin;
        }

        return $role === UserRole::Admin->value;
    }
}
