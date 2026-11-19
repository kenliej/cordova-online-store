<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    /** @use HasFactory<\Database\Factories\ProductFactory> */
    use HasFactory, SoftDeletes;

    /** @var list<string> */
    protected $fillable = [
        'store_id',
        'category_id',
        'name',
        'slug',
        'sku',
        'description',
        'price',
        'original_price',
        'stock',
        'is_new',
        'is_active',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'store_id' => 'integer',
            'category_id' => 'integer',
            'price' => 'decimal:2',
            'original_price' => 'decimal:2',
            'stock' => 'integer',
            'is_new' => 'boolean',
            'is_active' => 'boolean',
            'created_by' => 'integer',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order')->orderBy('id');
    }

    public function highlights(): HasMany
    {
        return $this->hasMany(ProductHighlight::class)->orderBy('sort_order')->orderBy('id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    public function scopeInStock(Builder $query): void
    {
        $query->where('stock', '>', 0);
    }

    public function scopeOutOfStock(Builder $query): void
    {
        $query->where('stock', 0);
    }

    public function isInStock(): bool
    {
        return $this->stock > 0;
    }

    /**
     * Discount percentage derived from `original_price`; null when not discounted.
     */
    public function discountPercent(): ?int
    {
        $original = $this->original_price !== null ? (float) $this->original_price : null;
        $price = (float) $this->price;

        if ($original === null || $original <= 0 || $original <= $price) {
            return null;
        }

        return (int) round((1 - ($price / $original)) * 100);
    }
}
