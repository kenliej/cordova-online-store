<?php

namespace App\Enums;

enum UserStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case Rejected = 'rejected';
    case Removed = 'removed';
    case Banned = 'banned';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Active => 'Active',
            self::Rejected => 'Rejected',
            self::Removed => 'Removed',
            self::Banned => 'Banned',
        };
    }

    /** Statuses that may authenticate. */
    public function canAuthenticate(): bool
    {
        return $this === self::Active;
    }

    public function isRemoved(): bool
    {
        return $this === self::Removed || $this === self::Banned;
    }
}
