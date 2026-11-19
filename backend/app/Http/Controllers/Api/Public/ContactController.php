<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Contact\ContactMessageRequest;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;

/**
 * Public "Contact Us" form (§5). Throttled 3/h/IP at the route level.
 * `website` is a honeypot: bots that fill it get the same success response but
 * nothing is persisted (silent rejection — no hint to the bot).
 */
class ContactController extends Controller
{
    public function store(ContactMessageRequest $request): JsonResponse
    {
        if (trim((string) $request->input('website', '')) !== '') {
            return $this->created(null, 'Your message has been sent successfully!');
        }

        ContactMessage::create([
            'name' => (string) $request->input('name'),
            'email' => (string) $request->input('email'),
            'phone' => (string) $request->input('phone'),
            'subject' => (string) $request->input('subject'),
            'message' => (string) $request->input('message'),
            'status' => 'new',
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);

        return $this->created(null, 'Your message has been sent successfully!');
    }
}
