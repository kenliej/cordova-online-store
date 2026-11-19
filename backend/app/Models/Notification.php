<?php

namespace App\Models;

use App\Enums\NotificationCategory;
use Database\Factories\NotificationFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    /** @use HasFactory<NotificationFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'category',
        'title',
        'body',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'category' => NotificationCategory::class,
            'read_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }

    public function categoryValue(): string
    {
        return $this->category instanceof NotificationCategory
            ? $this->category->value
            : (string) $this->category;
    }

    public function categoryLabel(): string
    {
        return $this->category instanceof NotificationCategory
            ? $this->category->label()
            : (NotificationCategory::tryFrom((string) $this->category)?->label() ?? (string) $this->category);
    }

    public function isRead(): bool
    {
        return $this->read_at !== null;
    }
}
