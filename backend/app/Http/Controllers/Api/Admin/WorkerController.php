<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListWorkersRequest;
use App\Http\Requests\Admin\StoreWorkerRequest;
use App\Http\Requests\Admin\UpdateWorkerRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/**
 * Admin worker-account management. Workers are created active with a generated
 * 12-digit worker_no; removing an account marks it `removed` (never deletes).
 * Administrator accounts can never be modified through these endpoints.
 */
class WorkerController extends Controller
{
    /** Lightweight list (for selects) of worker accounts. */
    public function index(ListWorkersRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $status = $validated['status'] ?? 'active';

        $query = User::query()->workers();

        switch ($status) {
            case 'active':
                $query->where('status', UserStatus::Active->value);
                break;
            case 'removed':
                $query->whereIn('status', [UserStatus::Removed->value, UserStatus::Banned->value]);
                break;
            default: // all
                break;
        }

        $query->search($validated['search'] ?? null)->orderBy('name');

        return $this->ok(UserResource::collection($query->get())->resolve());
    }

    public function store(StoreWorkerRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $worker = DB::transaction(fn (): User => User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => $validated['password'],
            'role' => UserRole::Worker->value,
            'status' => UserStatus::Active->value,
            'worker_no' => User::generateWorkerNo(),
            'gender' => $validated['gender'] ?? null,
            'birthday' => $validated['birthday'] ?? null,
            'address' => $validated['address'] ?? null,
            'store_id' => $validated['store_id'] ?? null,
            'bad_records' => 0,
        ]));

        AuditLogger::log('worker.create', $worker, [
            'worker_no' => $worker->worker_no,
            'store_id' => $worker->store_id,
        ]);

        return $this->created(new UserResource($worker), 'Worker account created successfully.');
    }

    public function update(UpdateWorkerRequest $request, User $user): JsonResponse
    {
        if ($user->isAdmin()) {
            throw DomainException::forbidden('Administrator accounts cannot be modified here.', 'cannot_edit_admin');
        }

        if (! $user->isWorker()) {
            abort(404, 'Resource not found.');
        }

        if ($user->status !== UserStatus::Active) {
            throw DomainException::invalidState('Only active worker accounts can be edited.', 'invalid_account_status');
        }

        Gate::authorize('updateWorker', $user);

        $validated = $request->validated();
        $password = $validated['password'] ?? null;

        $user->fill(Arr::except($validated, ['password']));
        $user->save();

        if (is_string($password) && $password !== '') {
            $user->forceFill(['password' => $password])->save();
        }

        AuditLogger::log('worker.update', $user, ['fields' => array_keys($validated)]);

        return $this->ok(new UserResource($user->refresh()), 'Worker account updated successfully.');
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->isAdmin()) {
            throw DomainException::forbidden('Administrator accounts cannot be removed.', 'cannot_remove_admin');
        }

        if ($request->user()->getKey() === $user->getKey()) {
            throw DomainException::forbidden('You cannot remove your own account.', 'cannot_remove_self');
        }

        if (! $user->isWorker()) {
            abort(404, 'Resource not found.');
        }

        if ($user->status !== UserStatus::Active) {
            throw DomainException::invalidState('Only active worker accounts can be removed.', 'invalid_account_status');
        }

        Gate::authorize('deleteWorker', $user);

        $user->forceFill(['status' => UserStatus::Removed->value])->save();

        AuditLogger::log('worker.remove', $user, ['worker_no' => $user->worker_no]);

        return $this->ok(new UserResource($user->refresh()), 'Worker account removed successfully.');
    }
}
