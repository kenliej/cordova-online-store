<?php

namespace App\Http\Controllers\Api\Auth;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Sanctum SPA (cookie) authentication: login accepts email OR phone, blocks
 * non-active accounts with a stable machine-readable code, regenerates the
 * session and exposes /me + /logout.
 */
class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = $request->resolveUser();

        if ($user->status !== UserStatus::Active) {
            return $this->inactiveAccountResponse($user->status);
        }

        Auth::guard('web')->login($user, $request->boolean('remember'));

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        $user->forceFill(['last_login_at' => now()])->saveQuietly();

        AuditLogger::log('auth.login', $user, ['role' => $user->role?->value]);

        return $this->ok(new UserResource($user), 'Logged in successfully.');
    }

    public function logout(Request $request): Response
    {
        $user = $request->user();

        if ($user !== null) {
            AuditLogger::log('auth.logout', $user);
        }

        // Bearer-token clients (cross-origin deployment): revoke the presented token.
        $accessToken = $user?->currentAccessToken();
        if ($accessToken instanceof PersonalAccessToken) {
            $accessToken->delete();
        }

        // Clear the in-memory web guard for cookie clients; the framework tests
        // and stateless requests may not have a started session.
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->noContent();
    }

    public function me(Request $request): JsonResponse
    {
        return $this->ok(new UserResource($request->user()));
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
