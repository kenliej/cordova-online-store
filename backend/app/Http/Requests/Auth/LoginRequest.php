<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Login accepts `login` = email OR phone, plus password and remember flag.
 */
class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $login = $this->input('login');

        if (is_string($login)) {
            $this->merge(['login' => trim($login)]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'login' => ['required', 'string', 'max:190'],
            'password' => ['required', 'string', 'max:255'],
            'remember' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Resolve the account by email (case-insensitive) or phone.
     */
    public function resolveUser(): ?User
    {
        $login = (string) $this->validated('login');

        $user = User::query()
            ->where(function ($query) use ($login): void {
                $query->whereRaw('lower(email) = ?', [mb_strtolower($login)])
                    ->orWhere('phone', $login);
            })
            ->first();

        if (! $user || ! Hash::check((string) $this->validated('password'), $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['The provided credentials are incorrect.'],
            ]);
        }

        return $user;
    }
}
