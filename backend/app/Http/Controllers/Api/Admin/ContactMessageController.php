<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Contact\UpdateContactMessageRequest;
use App\Http\Resources\Commerce\ContactMessageResource;
use App\Models\ContactMessage;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Admin contact-message inbox (§5). Paginated, newest first, optional status
 * filter; status changes are audited (§6.11).
 */
class ContactMessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', Rule::in(['all', 'new', 'read', 'replied'])],
            'search' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = ContactMessage::query()->orderByDesc('created_at')->orderByDesc('id');

        $status = $validated['status'] ?? null;

        if ($status !== null && $status !== 'all') {
            $query->where('status', $status);
        }

        $search = trim((string) ($validated['search'] ?? ''));

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->whereLike('name', '%'.$search.'%')
                    ->orWhereLike('email', '%'.$search.'%')
                    ->orWhereLike('subject', '%'.$search.'%');
            });
        }

        $paginator = $query->paginate((int) ($validated['per_page'] ?? 20))->withQueryString();

        return $this->paginated(
            $paginator,
            ContactMessageResource::collection($paginator->getCollection())->resolve(),
        );
    }

    public function update(UpdateContactMessageRequest $request, ContactMessage $message): JsonResponse
    {
        $previous = $message->status;
        $message->forceFill(['status' => (string) $request->input('status')])->save();

        AuditLogger::log('contact_message.status_updated', $message, [
            'from' => $previous,
            'to' => $message->status,
        ]);

        return $this->ok((new ContactMessageResource($message->refresh()))->resolve(), 'Message status updated.');
    }
}
