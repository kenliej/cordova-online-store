<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 *
 * Default state: active customer with a generated 12-digit customer number.
 * Useful states: admin(), worker(), customer(), pending(), rejected(),
 * removed(), banned(), active(), withBadRecords($n), withCustomerNo(),
 * withWorkerNo(), withProfilePhoto(), unverified().
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Monotonic 12-digit public account numbers (unique per test process).
     */
    protected static int $accountNumberSequence = 900_000_000_000;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'phone' => '09'.fake()->unique()->numerify('#########'),
            'role' => UserRole::Customer->value,
            'status' => UserStatus::Active->value,
            'customer_no' => static::nextAccountNumber(),
            'worker_no' => null,
            'gender' => fake()->randomElement(['Real Men', 'Gender Neutral', 'Female']),
            'birthday' => now()->subYears(random_int(18, 60))->subDays(random_int(0, 360))->toDateString(),
            'address' => fake()->streetAddress().', '.fake()->city(),
            'profile_photo_path' => null,
            'bad_records' => 0,
            'store_id' => null,
            'last_login_at' => null,
        ];
    }

    /* ---------------------------------------------------------------------
     | Role states
     | ------------------------------------------------------------------- */

    public function admin(): static
    {
        return $this->state(fn (): array => [
            'role' => UserRole::Admin->value,
            'status' => UserStatus::Active->value,
            'customer_no' => null,
            'worker_no' => null,
        ]);
    }

    public function worker(): static
    {
        return $this->state(fn (): array => [
            'role' => UserRole::Worker->value,
            'status' => UserStatus::Active->value,
            'customer_no' => null,
            'worker_no' => static::nextAccountNumber(),
        ]);
    }

    public function customer(): static
    {
        return $this->state(fn (): array => [
            'role' => UserRole::Customer->value,
            'customer_no' => static::nextAccountNumber(),
        ]);
    }

    /* ---------------------------------------------------------------------
     | Status states
     | ------------------------------------------------------------------- */

    public function active(): static
    {
        return $this->state(fn (): array => ['status' => UserStatus::Active->value]);
    }

    public function pending(): static
    {
        return $this->state(fn (): array => [
            'status' => UserStatus::Pending->value,
            'customer_no' => null,
            'email_verified_at' => null,
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (): array => [
            'status' => UserStatus::Rejected->value,
            'email_verified_at' => null,
        ]);
    }

    public function removed(): static
    {
        return $this->state(fn (): array => ['status' => UserStatus::Removed->value]);
    }

    public function banned(): static
    {
        return $this->state(fn (): array => [
            'status' => UserStatus::Banned->value,
            'bad_records' => 2,
        ]);
    }

    /* ---------------------------------------------------------------------
     | Attribute states
     | ------------------------------------------------------------------- */

    public function withBadRecords(int $count = 1): static
    {
        return $this->state(fn (): array => ['bad_records' => $count]);
    }

    public function withCustomerNo(?string $number = null): static
    {
        return $this->state(fn (): array => [
            'customer_no' => $number ?? static::nextAccountNumber(),
        ]);
    }

    public function withWorkerNo(?string $number = null): static
    {
        return $this->state(fn (): array => [
            'worker_no' => $number ?? static::nextAccountNumber(),
        ]);
    }

    public function withProfilePhoto(): static
    {
        return $this->state(fn (): array => [
            'profile_photo_path' => 'seed/avatars/customer.png',
        ]);
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    protected static function nextAccountNumber(): string
    {
        return (string) static::$accountNumberSequence++;
    }
}
