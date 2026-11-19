<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route-level role gate. Usage: ->middleware('role:admin') or 'role:worker,admin'.
 * Also blocks non-active accounts (defence in depth on top of the auth guard).
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $status = $user->status;
        $statusValue = $status instanceof UserStatus ? $status->value : (string) $status;

        if ($statusValue !== UserStatus::Active->value) {
            abort(403, 'Your account is not active.');
        }

        $role = $user->role;
        $roleValue = $role instanceof UserRole ? $role->value : (string) $role;

        if ($roles !== [] && ! in_array($roleValue, $roles, true)) {
            abort(403, 'You do not have permission to access this resource.');
        }

        return $next($request);
    }
}
