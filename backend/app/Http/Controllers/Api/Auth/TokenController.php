<?php

namespace App\Http\Controllers\Api\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;

/**
 * Bearer-token login for cross-origin deployments (e.g. frontend on Vercel,
 * API on shared cPanel hosting). Cookie-based Sanctum sessions cannot be relied
 * on across sites, so the SPA uses this endpoint when VITE_API_BASE_URL points
 * at a different origin.
 *
 * Tokens are hashed at rest by Sanctum, carry a role ability, optionally expire
 * (SANCTUM_EXPIRATION minutes) and are revoked on logout / account removal.
 */
class TokenController extends Controller
{
    public function store(LoginRequest $request): JsonResponse
    {
        $user = $request->resolveUser();

        if ($user->status !== UserStatus::Active) {
            return $this->inactiveAccountResponse($user->status);
        }

        $deviceName = mb_substr((string) ($request->input('device_name') ?: 'spa'), 0, 60);
        $abilities = match ($user->role) {
            UserRole::Admin => ['role:admin'],
            UserRole::Worker => ['role:worker'],
            default => ['role:customer'],
        };

        $expirationMinutes = config('sanctum.expiration');
        $expiresAt = $expirationMinutes !== null ? now()->addMinutes((int) $expirationMinutes) : null;

        // Only one active token per device name keeps the table tidy; the client
        // still gets a fresh value on every login.
        $user->tokens()->where('name', $deviceName)->delete();

        $token = $user->createToken($deviceName, $abilities, $expiresAt);

        $user->forceFill(['last_login_at' => now()])->saveQuietly();

        AuditLogger::log('auth.token_issued', $user, [
            'device' => $deviceName,
            'abilities' => $abilities,
        ]);

        return $this->ok([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt?->toIso8601String(),
            'abilities' => $abilities,
            'user' => (new UserResource($user))->resolve($request),
        ], 'Logged in successfully.');
    }

    private function inactiveAccountResponse(UserStatus $status): JsonResponse
    {
        [$code, $message] = match ($status) {
            UserStatus::Pending => ['account_pending', 'Your account is pending approval by the mall staff.'],
            UserStatus::Rejected => ['account_rejected', 'Your registration was rejected. Please contact mall support.'],
            UserStatus::Removed => ['account_removed', 'This account has been removed.'],
            UserStatus::Banned => ['account_banned', 'This account has been banned.'],
            default => ['account_inactive', 'Your account is not active.'],
        };

        return $this->fail($message, 403, $code);
    }
}
