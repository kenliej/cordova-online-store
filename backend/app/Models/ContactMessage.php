<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ContactMessage extends Model
{
    public const STATUSES = ['new', 'read', 'replied'];

    protected $fillable = [
        'name',
        'email',
        'phone',
        'subject',
        'message',
        'status',
        'ip_address',
        'user_agent',
    ];

    public function scopeWithStatus(Builder $query, ?string $status): Builder
    {
        return $status === null || $status === '' || $status === 'all'
            ? $query
            : $query->where('status', $status);
    }
}
