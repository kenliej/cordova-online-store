<?php

namespace App\Http\Requests\Contact;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Public contact form. `website` is a honeypot: real users never fill it, so a
 * non-empty value is silently accepted without persisting (see controller).
 */
class ContactMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email', 'max:190'],
            'phone' => ['required', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{7,20}$/'],
            'subject' => ['required', 'string', 'max:160'],
            'message' => ['required', 'string', 'max:5000'],
            'website' => ['nullable', 'string', 'max:255'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('name') && $this->has('fullName')) {
            $this->merge(['name' => $this->input('fullName')]);
        }

        if (! $this->has('phone') && $this->has('phoneNumber')) {
            $this->merge(['phone' => $this->input('phoneNumber')]);
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone.regex' => 'Please provide a valid phone number.',
        ];
    }
}
