<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Admin creates a mall worker account (active immediately, worker_no generated).
 */
class StoreWorkerRequest extends FormRequest
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

        $this->merge($normalised);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email', 'max:190', Rule::unique('users', 'email')],
            'phone' => [
                'required', 'string', 'max:20', Rule::unique('users', 'phone'),
                'regex:/^[0-9+()\-\s]{7,20}$/',
            ],
            'address' => ['nullable', 'string', 'max:255'],
            'birthday' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', 'string', 'max:40'],
            'password' => ['required', 'string', Password::defaults()],
            'store_id' => ['nullable', 'integer'],
        ];

        if (Schema::hasTable('stores')) {
            $rules['store_id'][] = 'exists:stores,id';
        }

        return $rules;
    }
}
