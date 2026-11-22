<?php

namespace App\Models;

use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
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

    /**
     * Filter by a product category slug (or numeric id). Parent categories also
     * match products filed under their children ("Electronics" → "Electronics - Audio").
     */
    public function scopeFilterCategory(Builder $query, mixed $category): void
    {
        if (! is_string($category) || trim($category) === '') {
            return;
        }

        $category = trim($category);

        $model = Category::query()
            ->where('type', Category::TYPE_PRODUCT)
            ->where(function (Builder $query) use ($category): void {
                $query->where('slug', $category)->orWhere('name', $category);

                if (ctype_digit($category)) {
                    $query->orWhereKey((int) $category);
                }
            })
            ->first();

        if ($model === null) {
            $query->whereIn('category_id', []);

            return;
        }

        $ids = $model->children()->pluck('id')->push($model->getKey())->unique()->values()->all();

        $query->whereIn('category_id', $ids);
    }

    public function scopeSearch(Builder $query, mixed $term): void
    {
        if (! is_string($term) || trim($term) === '') {
            return;
        }

        $term = trim($term);

        $query->where(function (Builder $query) use ($term): void {
            // whereLike() is portable: PostgreSQL compiles ILIKE so search stays
            // case-insensitive (plain LIKE is case-sensitive on PG).
            $query->whereLike('name', "%{$term}%")
                ->orWhereLike('description', "%{$term}%");
        });
    }

    /**
     * Whitelisted sorting: price_asc | price_desc | newest.
     */
    public function scopeSorted(Builder $query, mixed $sort): void
    {
        match ($sort) {
            'price_asc' => $query->orderBy('price')->orderBy('id'),
            'price_desc' => $query->orderByDesc('price')->orderBy('id'),
            default => $query->orderByDesc('created_at')->orderByDesc('id'),
        };
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
