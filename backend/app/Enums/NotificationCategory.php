<?php

namespace App\Enums;

enum NotificationCategory: string
{
    case Offers = 'offers';
    case Order = 'order';
    case System = 'system';

    public function label(): string
    {
        return match ($this) {
            self::Offers => 'Offers & Sales',
            self::Order => 'Order',
            self::System => 'System',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
