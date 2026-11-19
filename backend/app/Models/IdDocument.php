<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One government ID scan (front or back) uploaded during registration.
 * The file itself lives on the `private` disk and is streamed only through
 * ProfileController::downloadIdDocument / Admin\AccountController::idDocuments.
 */
class IdDocument extends Model
{
    use HasFactory;

    public const TYPE_FRONT = 'id_front';

    public const TYPE_BACK = 'id_back';

    /** @var list<string> */
    protected $fillable = [
        'user_id',
        'type',
        'path',
        'original_name',
        'mime',
        'size_bytes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isFront(): bool
    {
        return $this->type === self::TYPE_FRONT;
    }

    public function isBack(): bool
    {
        return $this->type === self::TYPE_BACK;
    }
}
