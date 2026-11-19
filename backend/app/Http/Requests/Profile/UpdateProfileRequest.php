<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Self-service profile edit. Only the mutable profile fields are accepted;
 * role/status/customer_no are never editable by the account owner.
 */
class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $normalised = [];

        foreach (['name', 'phone', 'address', 'gender'] as $field) {
            $value = $this->input($field);

            if (is_string($value)) {
                $normalised[$field] = trim($value);
            }
        }

        $this->merge($normalised);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $userId = $this->user()->getKey();

        return [
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'phone' => [
                'sometimes', 'nullable', 'string', 'max:20',
                'regex:/^[0-9+()\-\s]{7,20}$/',
                Rule::unique('users', 'phone')->ignore($userId),
            ],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'gender' => ['sometimes', 'nullable', 'string', 'max:40'],
            'birthday' => ['sometimes', 'nullable', 'date', 'before_or_equal:'.now()->subYears(18)->toDateString()],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'birthday.before_or_equal' => 'You must be at least 18 years old.',
        ];
    }
}
