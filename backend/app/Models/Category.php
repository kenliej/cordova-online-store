<?php

namespace App\Models;

use Database\Factories\CategoryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    /** @use HasFactory<CategoryFactory> */
    use HasFactory;

    public const TYPE_PRODUCT = 'product';

    public const TYPE_STORE = 'store';

    /** @var list<string> */
    protected $fillable = [
        'name',
        'slug',
        'type',
        'parent_id',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'parent_id' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function stores(): HasMany
    {
        return $this->hasMany(Store::class);
    }

    /**
     * UI-facing two-level label: "Electronics - Audio" for children, plain name
     * for top-level categories.
     */
    public function displayName(): string
    {
        $parent = $this->parent_id !== null ? $this->parent : null;

        return $parent instanceof self ? $parent->name.' - '.$this->name : $this->name;
    }
}
