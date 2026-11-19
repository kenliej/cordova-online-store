<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

/**
 * Create (or promote) a real administrator without seeding demo accounts.
 *
 * Usage:
 *   php artisan user:create-admin admin@example.com --name="Store Admin"
 *   php artisan user:create-admin admin@example.com --password='?'
 *   php artisan user:create-admin --help
 */
class CreateAdminCommand extends Command
{
    protected $signature = 'user:create-admin
                            {email : E-mail address of the administrator}
                            {--name= : Display name (defaults to the e-mail local part)}
                            {--password= : Password (omitted/`?` generates a strong one)}';

    protected $description = 'Create or promote an active administrator account (production-safe alternative to db:seed)';

    public function handle(): int
    {
        $email = mb_strtolower(trim((string) $this->argument('email')));
        $passwordOption = $this->option('password');

        if ($passwordOption === null || $passwordOption === '?') {
            $password = Str::password(20, symbols: true);
            $generated = true;
        } else {
            $password = (string) $passwordOption;
            $generated = false;
        }

        $name = trim((string) ($this->option('name') ?: Str::headline(Str::before($email, '@'))));

        $validator = Validator::make(
            ['email' => $email, 'name' => $name, 'password' => $password],
            [
                'email' => ['required', 'email', 'max:190'],
                'name' => ['required', 'string', 'max:120'],
                'password' => ['required', 'string', Password::defaults()],
            ],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $user = User::query()->where('email', $email)->first();

        if ($user !== null && $user->role === UserRole::Admin && $user->status === UserStatus::Active) {
            $this->warn("An active administrator already exists for {$email}; nothing changed.");

            return self::SUCCESS;
        }

        if ($user !== null) {
            $user->forceFill([
                'role' => UserRole::Admin,
                'status' => UserStatus::Active,
                'password' => Hash::make($password),
                'name' => $name,
                'email_verified_at' => $user->email_verified_at ?? now(),
            ])->save();

            $this->info("Promoted existing account {$email} to administrator (status active).");
        } else {
            $user = User::query()->create([
                'name' => $name,
                'email' => $email,
                'phone' => null,
                'password' => Hash::make($password),
                'role' => UserRole::Admin,
                'status' => UserStatus::Active,
                'email_verified_at' => now(),
            ]);

            $this->info("Created administrator {$email}.");
        }

        if ($generated) {
            $this->newLine();
            $this->line('  Generated password: '.$password);
            $this->warn('Store it in a password manager now — it will not be shown again.');
        }

        $this->newLine();
        $this->line('You can now log in at the admin dashboard.');

        return self::SUCCESS;
    }
}
