<?php

namespace App\Http\Requests\Auth;

use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Customer self-registration: multipart form with profile photo (optional) and
 * two government ID scans (required, private disk).
 */
class RegisterRequest extends FormRequest
{
    private const IMAGE_MIMES = 'mimes:jpg,jpeg,png,webp';

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalised = [];

        foreach (['name', 'phone', 'address'] as $field) {
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
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email', 'max:190', Rule::unique('users', 'email')],
            'phone' => [
                'required', 'string', 'max:20', Rule::unique('users', 'phone'),
                'regex:/^[0-9+()\-\s]{7,20}$/',
            ],
            'address' => ['required', 'string', 'max:255'],
            'birthday' => ['required', 'date', 'before_or_equal:'.now()->subYears(18)->toDateString()],
            'gender' => ['nullable', 'string', 'max:40'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
            'agree_terms' => ['required', 'accepted'],
            'profile_photo' => ['nullable', 'image', self::IMAGE_MIMES, 'max:2048'],
            'id_front' => ['required', 'image', self::IMAGE_MIMES, 'max:5120'],
            'id_back' => ['required', 'image', self::IMAGE_MIMES, 'max:5120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'birthday.before_or_equal' => 'You must be at least 18 years old to register.',
            'agree_terms.accepted' => 'You must agree to the Terms of Service and Privacy Policy.',
            'id_front.required' => 'The first valid ID image is required.',
            'id_back.required' => 'The second valid ID image is required.',
            'id_front.max' => 'Each ID image may not be larger than 5MB.',
            'id_back.max' => 'Each ID image may not be larger than 5MB.',
            'profile_photo.max' => 'The profile photo may not be larger than 2MB.',
        ];
    }

    /**
     * Persist the pending customer account together with its ID documents.
     * Callers must wrap this in DB::transaction.
     */
    public function createUser(): User
    {
        $data = $this->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'password' => $data['password'],
            'role' => 'customer',
            'status' => UserStatus::Pending->value,
            'gender' => $data['gender'] ?? null,
            'birthday' => $data['birthday'],
            'address' => $data['address'],
            'bad_records' => 0,
        ]);

        if ($this->hasFile('profile_photo')) {
            $path = $this->file('profile_photo')->store('profile-photos/'.$user->getKey(), 'public');
            $user->forceFill(['profile_photo_path' => $path])->save();
        }

        foreach (['id_front', 'id_back'] as $type) {
            $file = $this->file($type);
            $path = $file->store('id-documents/'.$user->getKey(), 'private');

            $user->idDocuments()->create([
                'type' => $type,
                'path' => $path,
                'original_name' => mb_substr($file->getClientOriginalName(), 0, 255),
                'mime' => $file->getMimeType(),
                'size_bytes' => $file->getSize(),
            ]);
        }

        return $user;
    }
}
