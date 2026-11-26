<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateAvatarRequest;
use App\Http\Requests\Profile\UpdatePasswordRequest;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Http\Resources\ProfileResource;
use App\Http\Resources\UserResource;
use App\Models\IdDocument;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Self-service profile for every authenticated role.
 */
class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return $this->ok(new ProfileResource($request->user()->load('idDocuments')));
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->fill($request->validated())->save();

        return $this->ok(new UserResource($user->refresh()), 'Profile updated successfully.');
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->forceFill(['password' => (string) $request->validated('password')])->save();

        // Keep the current browser session, revoke every other session/token.
        $user->revokeSessions($request->hasSession() ? $request->session()->getId() : null);

        AuditLogger::log('profile.password_changed', $user);

        return $this->ok(['message' => 'Password updated successfully.']);
    }

    public function updateAvatar(UpdateAvatarRequest $request): JsonResponse
    {
        $user = $request->user();
        $path = $request->file('avatar')->store('profile-photos/'.$user->getKey(), 'public');

        $previous = $user->profile_photo_path;

        $user->forceFill(['profile_photo_path' => $path])->save();

        if ($previous !== null && ! str_starts_with($previous, 'http')) {
            Storage::disk('public')->delete($previous);
        }

        AuditLogger::log('profile.avatar_changed', $user);

        return $this->ok(new UserResource($user->refresh()), 'Profile photo updated successfully.');
    }

    /**
     * Stream a private ID scan. Only the owner or an administrator may read it;
     * anybody else gets a 404 (no IDOR enumeration, no public URL).
     */
    public function downloadIdDocument(Request $request, IdDocument $document): StreamedResponse
    {
        if (! Gate::allows('download', $document)) {
            abort(404, 'Resource not found.');
        }

        $disk = Storage::disk('private');

        if (! $disk->exists($document->path)) {
            abort(404, 'Resource not found.');
        }

        $filename = $document->original_name ?: basename($document->path);

        // Works for both the local private disk and Neon's private S3 bucket.
        return $disk->response($document->path, $filename, [
            'Content-Type' => $document->mime ?: 'application/octet-stream',
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }
}
