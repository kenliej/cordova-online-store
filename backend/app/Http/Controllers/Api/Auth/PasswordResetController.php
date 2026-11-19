<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

/**
 * Standard Laravel password broker over email. The forgot-password response is
 * always 200 to prevent account enumeration.
 */
class PasswordResetController extends Controller
{
    public function sendResetLinkEmail(ForgotPasswordRequest $request): JsonResponse
    {
        try {
            Password::broker()->sendResetLink([
                'email' => (string) $request->validated('email'),
            ]);
        } catch (\Throwable $e) {
            // Never reveal whether the address exists; just make the failure visible in logs.
            Log::warning('password_reset_link_failed', ['error' => $e->getMessage()]);
        }

        return $this->ok([
            'message' => 'If an account matches that email, a password reset link has been sent.',
        ]);
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::broker()->reset(
            $request->only(['email', 'password', 'password_confirmation', 'token']),
            function (User $user, string $password): void {
                $user->forceFill(['password' => $password])->save();

                // A password reset invalidates every existing session/token.
                $user->revokeSessions();
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            // One generic message for every failure mode: revealing whether the
            // token or the account was invalid enables account enumeration.
            Log::info('password_reset_failed', ['status' => $status]);

            throw ValidationException::withMessages([
                'email' => ['This password reset link is invalid or has expired.'],
            ]);
        }

        return $this->ok(['message' => 'Your password has been reset successfully.']);
    }
}
