<?php

namespace App\Http\Controllers\Api\Auth;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Customer self-registration (multipart with two private ID scans).
 * Creates a pending customer, never a session: an admin must approve first.
 */
class RegisterController extends Controller
{
    public function __invoke(RegisterRequest $request): JsonResponse
    {
        $user = DB::transaction(fn () => $request->createUser());

        AuditLogger::log('account.register', $user, [
            'role' => 'customer',
            'has_profile_photo' => $user->profile_photo_path !== null,
        ]);

        return $this->created(
            [
                'message' => 'Registration submitted. Your account is pending approval.',
                'status' => UserStatus::Pending->value,
            ],
            'Registration submitted successfully.',
        );
    }
}
