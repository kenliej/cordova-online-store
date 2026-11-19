<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Order;
use App\Models\User;

/**
 * Order visibility/action rules (§6.1–§6.3).
 * Customers may only ever see and cancel their own orders; staff roles may
 * view any order (worker/admin routes are additionally role-gated).
 */
class OrderPolicy
{
    public function view(User $user, Order $order): bool
    {
        return $this->owns($user, $order) || $this->isStaff($user);
    }

    public function cancel(User $user, Order $order): bool
    {
        return $this->owns($user, $order);
    }

    public function updateStatus(User $user, Order $order): bool
    {
        return $this->isStaff($user);
    }

    private function owns(User $user, Order $order): bool
    {
        return (int) $order->user_id === (int) $user->id;
    }

    private function isStaff(User $user): bool
    {
        return in_array($this->roleValue($user), [UserRole::Worker->value, UserRole::Admin->value], true);
    }

    private function roleValue(User $user): string
    {
        $role = $user->role ?? null;

        if ($role instanceof \BackedEnum) {
            return (string) $role->value;
        }

        return (string) $role;
    }
}
