<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserStatus;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListAccountsRequest;
use App\Http\Resources\IdDocumentResource;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Admin account dashboard: pending approvals, customer/worker tabs, removed
 * accounts, ID-document review. Every mutation is audited and state-machine
 * guarded (cannot remove self or another admin; 2+ bad records -> banned).
 */
class AccountController extends Controller
{
    private const PER_PAGE_DEFAULT = 15;

    private const PER_PAGE_MAX = 50;

    public function index(ListAccountsRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $perPage = min((int) ($validated['per_page'] ?? self::PER_PAGE_DEFAULT), self::PER_PAGE_MAX);

        $query = User::query()->withCount('idDocuments');

        switch ($validated['tab']) {
            case 'pending':
                $query->customers()->where('status', UserStatus::Pending->value)->oldest();
                break;
            case 'customer':
                $query->customers()->where('status', UserStatus::Active->value)->latest();
                break;
            case 'worker':
                $query->workers()->where('status', UserStatus::Active->value)->latest();
                break;
            default: // removed
                $query->whereIn('status', [UserStatus::Removed->value, UserStatus::Banned->value])->latest();
                break;
        }

        $query->search($validated['search'] ?? null);

        $accounts = $query->paginate($perPage)->withQueryString();

        return $this->paginated(
            $accounts,
            UserResource::collection($accounts->getCollection())->resolve(),
        );
    }

    public function idDocuments(User $user): JsonResponse
    {
        Gate::authorize('viewIdDocuments', $user);

        $user->load('idDocuments');
        $documents = $user->idDocuments;

        $front = $documents->firstWhere('type', 'id_front');
        $back = $documents->firstWhere('type', 'id_back');

        return $this->ok([
            'user' => (new UserResource($user))->resolve(),
            'documents' => IdDocumentResource::collection($documents)->resolve(),
            'id_front_url' => $front !== null ? url('/api/profile/id-documents/'.$front->getKey()) : null,
            'id_back_url' => $back !== null ? url('/api/profile/id-documents/'.$back->getKey()) : null,
        ]);
    }

    public function approve(Request $request, User $user): JsonResponse
    {
        if (! $user->isCustomer()) {
            throw DomainException::invalidState('Only customer registrations can be approved.', 'invalid_account_type');
        }

        if ($user->status !== UserStatus::Pending) {
            throw DomainException::invalidState('Only pending accounts can be approved.', 'invalid_account_status');
        }

        Gate::authorize('approve', $user);

        $approved = DB::transaction(function () use ($user): User {
            $account = User::query()->lockForUpdate()->findOrFail($user->getKey());

            if (! $account->isCustomer() || $account->status !== UserStatus::Pending) {
                throw DomainException::invalidState('Only pending accounts can be approved.', 'invalid_account_status');
            }

            $account->forceFill([
                'status' => UserStatus::Active->value,
                'customer_no' => $account->customer_no ?: User::generateCustomerNo(),
            ])->save();

            $this->notify(
                $account,
                'Account approved',
                'Your account has been approved. You can now sign in and start shopping.',
            );

            return $account;
        });

        AuditLogger::log('account.approve', $approved, ['customer_no' => $approved->customer_no]);

        return $this->ok(new UserResource($approved->refresh()), 'Account approved successfully.');
    }

    public function reject(Request $request, User $user): JsonResponse
    {
        if (! $user->isCustomer()) {
            throw DomainException::invalidState('Only customer registrations can be rejected.', 'invalid_account_type');
        }

        if ($user->status !== UserStatus::Pending) {
            throw DomainException::invalidState('Only pending accounts can be rejected.', 'invalid_account_status');
        }

        Gate::authorize('reject', $user);

        $rejected = DB::transaction(function () use ($user): User {
            $account = User::query()->lockForUpdate()->findOrFail($user->getKey());

            if ($account->status !== UserStatus::Pending) {
                throw DomainException::invalidState('Only pending accounts can be rejected.', 'invalid_account_status');
            }

            $account->forceFill(['status' => UserStatus::Rejected->value])->save();

            return $account;
        });

        AuditLogger::log('account.reject', $rejected);

        return $this->ok(new UserResource($rejected->refresh()), 'Registration rejected.');
    }

    public function remove(Request $request, User $user): JsonResponse
    {
        if ($user->isAdmin()) {
            throw DomainException::forbidden('Administrator accounts cannot be removed.', 'cannot_remove_admin');
        }

        if ($request->user()->getKey() === $user->getKey()) {
            throw DomainException::forbidden('You cannot remove your own account.', 'cannot_remove_self');
        }

        if ($user->status !== UserStatus::Active) {
            throw DomainException::invalidState('Only active accounts can be removed.', 'invalid_account_status');
        }

        Gate::authorize('remove', $user);

        $removed = DB::transaction(function () use ($user): User {
            $account = User::query()->lockForUpdate()->findOrFail($user->getKey());

            if ($account->status !== UserStatus::Active) {
                throw DomainException::invalidState('Only active accounts can be removed.', 'invalid_account_status');
            }

            // Policy: two unclaimed orders (bad records) = permanent ban.
            $banned = $account->isCustomer() && $account->bad_records >= 2;

            $account->forceFill([
                'status' => ($banned ? UserStatus::Banned : UserStatus::Removed)->value,
            ])->save();

            return $account;
        });

        $banned = $removed->status === UserStatus::Banned;
        AuditLogger::log($banned ? 'account.ban' : 'account.remove', $removed, [
            'role' => $removed->role?->value,
            'bad_records' => $removed->bad_records,
        ]);

        return $this->ok(
            new UserResource($removed->refresh()),
            $banned ? 'Customer banned successfully due to bad records.' : 'Account removed successfully.',
        );
    }

    public function restore(Request $request, User $user): JsonResponse
    {
        if ($user->isAdmin()) {
            throw DomainException::forbidden('Administrator accounts cannot be restored.', 'cannot_restore_admin');
        }

        if (! in_array($user->status, [UserStatus::Removed, UserStatus::Banned], true)) {
            throw DomainException::invalidState('Only removed or banned accounts can be restored.', 'invalid_account_status');
        }

        Gate::authorize('restore', $user);

        $restored = DB::transaction(function () use ($user): User {
            $account = User::query()->lockForUpdate()->findOrFail($user->getKey());

            if (! in_array($account->status, [UserStatus::Removed, UserStatus::Banned], true)) {
                throw DomainException::invalidState('Only removed or banned accounts can be restored.', 'invalid_account_status');
            }

            $account->forceFill(['status' => UserStatus::Active->value])->save();

            return $account;
        });

        AuditLogger::log('account.restore', $restored, ['role' => $restored->role?->value]);

        return $this->ok(new UserResource($restored->refresh()), 'Account restored successfully.');
    }

    /**
     * Best-effort in-app notification (the notifications table is owned by the
     * commerce module; the account action must not fail if it is unavailable).
     */
    private function notify(User $recipient, string $title, string $body, string $category = 'system'): void
    {
        if (! Schema::hasTable('notifications')) {
            return;
        }

        try {
            DB::table('notifications')->insert([
                'user_id' => $recipient->getKey(),
                'category' => $category,
                'title' => mb_substr($title, 0, 160),
                'body' => $body,
                'read_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('notification_create_failed', ['error' => $e->getMessage()]);
        }
    }
}
