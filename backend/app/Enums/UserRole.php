<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Worker = 'worker';
    case Customer = 'customer';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Administrator',
            self::Worker => 'Mall Worker',
            self::Customer => 'Customer',
        };
    }

    public function isStaff(): bool
    {
        return $this !== self::Customer;
    }
}
