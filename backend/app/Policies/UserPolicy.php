<?php

namespace App\Policies;

use App\Enums\UserStatus;
use App\Models\User;

/**
 * Account-administration abilities. Routes are already behind auth + role:admin;
 * these policies are the second, subject-level gate (self/admin protection and
 * valid state transitions).
 */
class UserPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->isAdmin();
    }

    public function view(User $actor, User $target): bool
    {
        return $actor->isAdmin() || $actor->getKey() === $target->getKey();
    }

    public function viewIdDocuments(User $actor, User $target): bool
    {
        return $actor->isAdmin() || $actor->getKey() === $target->getKey();
    }

    /** Only pending customer registrations can be approved. */
    public function approve(User $actor, User $target): bool
    {
        return $actor->isAdmin()
            && $target->isCustomer()
            && $target->status === UserStatus::Pending;
    }

    /** Only pending customer registrations can be rejected. */
    public function reject(User $actor, User $target): bool
    {
        return $actor->isAdmin()
            && $target->isCustomer()
            && $target->status === UserStatus::Pending;
    }

    /** Active non-admin accounts can be removed (self-removal forbidden). */
    public function remove(User $actor, User $target): bool
    {
        return $actor->isAdmin()
            && $actor->getKey() !== $target->getKey()
            && ! $target->isAdmin()
            && $target->status === UserStatus::Active;
    }

    /** Removed/banned non-admin accounts can be restored. */
    public function restore(User $actor, User $target): bool
    {
        return $actor->isAdmin()
            && ! $target->isAdmin()
            && in_array($target->status, [UserStatus::Removed, UserStatus::Banned], true);
    }

    /** Worker accounts can be edited by admins. */
    public function updateWorker(User $actor, User $target): bool
    {
        return $actor->isAdmin()
            && $target->isWorker()
            && $target->status === UserStatus::Active;
    }

    /** Worker accounts can be removed by admins (self-removal forbidden). */
    public function deleteWorker(User $actor, User $target): bool
    {
        return $actor->isAdmin()
            && $actor->getKey() !== $target->getKey()
            && $target->isWorker()
            && $target->status === UserStatus::Active;
    }
}
