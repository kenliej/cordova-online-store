<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

/**
 * Application account (customer, mall worker or administrator).
 *
 * Shared contract for every module: `role`, `status`, `customer_no`,
 * `worker_no`, `gender`, `birthday`, `address`, `profile_photo_path`,
 * `bad_records`, `store_id`, `last_login_at`.
 *
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string|null $phone
 * @property UserRole $role
 * @property UserStatus $status
 * @property string|null $customer_no
 * @property string|null $worker_no
 * @property string|null $gender
 * @property \Illuminate\Support\Carbon|null $birthday
 * @property string|null $address
 * @property string|null $profile_photo_path
 * @property int $bad_records
 * @property int|null $store_id
 * @property \Illuminate\Support\Carbon|null $last_login_at
 * @property \Illuminate\Support\Carbon|null $email_verified_at
 */
class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',
        'status',
        'customer_no',
        'worker_no',
        'gender',
        'birthday',
        'address',
        'profile_photo_path',
        'bad_records',
        'store_id',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Derived attributes every serializer may rely on.
     *
     * @var list<string>
     */
    protected $appends = [
        'profile_photo_url',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'status' => UserStatus::class,
            'birthday' => 'date',
            'bad_records' => 'integer',
            'store_id' => 'integer',
            'last_login_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // Defence in depth: whenever an account is removed or banned (from any
        // module, e.g. the commerce auto-ban on unclaimed orders) all of its
        // active sessions/tokens are revoked.
        static::updated(function (User $user): void {
            if (! $user->wasChanged('status')) {
                return;
            }

            if (in_array($user->status, [UserStatus::Removed, UserStatus::Banned], true)) {
                $user->revokeSessions();
            }
        });
    }

    /* ---------------------------------------------------------------------
     | Relations
     | ------------------------------------------------------------------- */

    /** @return HasMany<IdDocument, $this> */
    public function idDocuments(): HasMany
    {
        return $this->hasMany(IdDocument::class);
    }

    /**
     * Assigned store (workers only; optional). Owned by the catalog module.
     *
     * @return BelongsTo<Store, $this>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /* ---------------------------------------------------------------------
     | Derived attributes
     | ------------------------------------------------------------------- */

    /**
     * Full public (or remote) URL of the avatar, or null when unset.
     *
     * Stored paths may be full external URLs (seed data) or paths on the
     * public disk (uploads).
     */
    protected function profilePhotoUrl(): Attribute
    {
        return Attribute::get(function (): ?string {
            $path = $this->profile_photo_path;

            if ($path === null || $path === '') {
                return null;
            }

            if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
                return $path;
            }

            return Storage::disk('public')->url($path);
        });
    }

    /* ---------------------------------------------------------------------
     | Role / status helpers
     | ------------------------------------------------------------------- */

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isWorker(): bool
    {
        return $this->role === UserRole::Worker;
    }

    public function isCustomer(): bool
    {
        return $this->role === UserRole::Customer;
    }

    public function canAuthenticate(): bool
    {
        return $this->status === UserStatus::Active;
    }

    /** Public account number shown in the UI (`customer_no` or `worker_no`). */
    public function accountNumber(): ?string
    {
        return $this->customer_no ?? $this->worker_no;
    }

    public function hasIdDocument(string $type): bool
    {
        return $this->idDocuments->contains(fn (IdDocument $document): bool => $document->type === $type);
    }

    /* ---------------------------------------------------------------------
     | Query scopes
     | ------------------------------------------------------------------- */

    /** @param  Builder<User>  $query */
    public function scopeCustomers(Builder $query): void
    {
        $query->where('role', UserRole::Customer->value);
    }

    /** @param  Builder<User>  $query */
    public function scopeWorkers(Builder $query): void
    {
        $query->where('role', UserRole::Worker->value);
    }

    /** @param  Builder<User>  $query */
    public function scopeAdmins(Builder $query): void
    {
        $query->where('role', UserRole::Admin->value);
    }

    /** @param  Builder<User>  $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('status', UserStatus::Active->value);
    }

    /**
     * Free-text search by name, email, phone or public account number.
     *
     * @param  Builder<User>  $query
     */
    public function scopeSearch(Builder $query, ?string $term): void
    {
        $term = trim((string) $term);

        if ($term === '') {
            return;
        }

        $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%';

        $query->where(function (Builder $query) use ($like): void {
            $query->where('name', 'like', $like)
                ->orWhere('email', 'like', $like)
                ->orWhere('phone', 'like', $like)
                ->orWhere('customer_no', 'like', $like)
                ->orWhere('worker_no', 'like', $like);
        });
    }

    /* ---------------------------------------------------------------------
     | Sessions / tokens
     | ------------------------------------------------------------------- */

    /** Revoke every session/token for the account (status change to removed/banned). */
    public function revokeSessions(?string $exceptSessionId = null): void
    {
        DB::table('sessions')
            ->where('user_id', $this->getKey())
            ->when($exceptSessionId !== null, fn ($query) => $query->where('id', '!=', $exceptSessionId))
            ->delete();

        $this->tokens()->delete();
    }

    /* ---------------------------------------------------------------------
     | Public account numbers
     | ------------------------------------------------------------------- */

    /** Generate an unused 12-digit numeric customer number. */
    public static function generateCustomerNo(): string
    {
        return static::generateAccountNumber('customer_no');
    }

    /** Generate an unused 12-digit numeric worker number. */
    public static function generateWorkerNo(): string
    {
        return static::generateAccountNumber('worker_no');
    }

    private static function generateAccountNumber(string $column): string
    {
        for ($attempt = 0; $attempt < 50; $attempt++) {
            $candidate = (string) random_int(100_000_000_000, 999_999_999_999);

            if (! static::query()->where($column, $candidate)->exists()) {
                return $candidate;
            }
        }

        throw new \RuntimeException('Unable to generate a unique public account number.');
    }
}
