<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->isStaff($user);
    }

    public function view(User $user, Product $product): bool
    {
        return $this->isStaff($user);
    }

    public function create(User $user): bool
    {
        return $this->isStaff($user);
    }

    public function update(User $user, Product $product): bool
    {
        return $this->isStaff($user);
    }

    public function delete(User $user, Product $product): bool
    {
        return $this->isStaff($user);
    }

    private function isStaff(User $user): bool
    {
        $role = $user->role;

        if ($role instanceof UserRole) {
            return $role === UserRole::Admin || $role === UserRole::Worker;
        }

        return $role === UserRole::Admin->value || $role === UserRole::Worker->value;
    }
}
