<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Admin edits a worker account. Password is optional (blank = unchanged).
 */
class UpdateWorkerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->isAdmin();
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

        $email = $this->input('email');

        if (is_string($email)) {
            $normalised['email'] = mb_strtolower(trim($email));
        }

        // The UI sends "" for "keep current password"; treat it as absent.
        if ($this->input('password') === '') {
            $normalised['password'] = null;
        }

        $this->merge($normalised);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $userId = $this->route('user')?->getKey();

        $rules = [
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => [
                'sometimes', 'required', 'string', 'email', 'max:190',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'phone' => [
                'sometimes', 'nullable', 'string', 'max:20',
                'regex:/^[0-9+()\-\s]{7,20}$/',
                Rule::unique('users', 'phone')->ignore($userId),
            ],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'birthday' => ['sometimes', 'nullable', 'date', 'before:today'],
            'gender' => ['sometimes', 'nullable', 'string', 'max:40'],
            'password' => ['sometimes', 'nullable', 'string', Password::defaults()],
            'store_id' => ['sometimes', 'nullable', 'integer'],
        ];

        if (Schema::hasTable('stores')) {
            $rules['store_id'][] = 'exists:stores,id';
        }

        return $rules;
    }
}
