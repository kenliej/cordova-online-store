<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/**
 * SCAFFOLD STUB - replace with the real implementation (docs/BACKEND_ARCHITECTURE.md).
 */
class PasswordResetController extends Controller
{
    public function sendResetLinkEmail(mixed ...$args): JsonResponse
    {
        // TODO(implementation): replace this scaffold stub per docs/BACKEND_ARCHITECTURE.md §5.
        return response()->json(['message' => 'Not implemented yet.'], 501);
    }

    public function reset(mixed ...$args): JsonResponse
    {
        // TODO(implementation): replace this scaffold stub per docs/BACKEND_ARCHITECTURE.md §5.
        return response()->json(['message' => 'Not implemented yet.'], 501);
    }

}
