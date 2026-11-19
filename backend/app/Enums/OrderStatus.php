<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Pending = 'pending';
    case Ready = 'ready';
    case Claimed = 'claimed';
    case Cancelled = 'cancelled';
    case NotClaimed = 'not_claimed';

    /** Labels exactly as rendered by the existing UI. */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Ready => 'Ready to Claim',
            self::Claimed => 'Claimed',
            self::Cancelled => 'Cancelled',
            self::NotClaimed => "Didn't Claimed",
        };
    }

    /** Terminal states never transition again. */
    public function isTerminal(): bool
    {
        return in_array($this, [self::Claimed, self::Cancelled, self::NotClaimed], true);
    }

    public function isActive(): bool
    {
        return in_array($this, [self::Pending, self::Ready], true);
    }

    /** @return array<int, self> */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Pending => [self::Ready, self::Cancelled],
            self::Ready => [self::Claimed, self::NotClaimed],
            default => [],
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return in_array($target, $this->allowedTransitions(), true);
    }

    /** Statuses for the customer "active orders" tab. */
    public static function activeCases(): array
    {
        return [self::Pending, self::Ready];
    }

    public static function historyCases(): array
    {
        return [self::Claimed, self::Cancelled, self::NotClaimed];
    }
}
