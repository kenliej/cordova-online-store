<?php

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    /** @use HasFactory<\Database\Factories\OrderFactory> */
    use HasFactory;

    /** Statuses that may still change (§6). */
    public const ACTIVE_STATUSES = ['pending', 'ready'];

    public const HISTORY_STATUSES = ['claimed', 'cancelled', 'not_claimed'];

    protected $fillable = [
        'order_number',
        'user_id',
        'status',
        'subtotal',
        'total',
        'payment_method',
        'payment_status',
        'pickup_location',
        'notes',
        'ready_at',
        'claim_deadline',
        'claimed_at',
        'cancelled_at',
        'not_claimed_at',
        'cancelled_by',
    ];

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'subtotal' => 'decimal:2',
            'total' => 'decimal:2',
            'ready_at' => 'datetime',
            'claim_deadline' => 'datetime',
            'claimed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'not_claimed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function histories(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class)->orderBy('id');
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', self::ACTIVE_STATUSES);
    }

    public function scopeHistory(Builder $query): Builder
    {
        return $query->whereIn('status', self::HISTORY_STATUSES);
    }

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    /** Raw string value of the enum-cast status column. */
    public function statusValue(): string
    {
        return $this->status instanceof OrderStatus ? $this->status->value : (string) $this->status;
    }

    public function statusLabel(): string
    {
        return $this->status instanceof OrderStatus
            ? $this->status->label()
            : (OrderStatus::tryFrom((string) $this->status)?->label() ?? (string) $this->status);
    }
}
