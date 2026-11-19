<?php

namespace App\Models;

use Database\Factories\StoreFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Store extends Model
{
    /** @use HasFactory<StoreFactory> */
    use HasFactory, SoftDeletes;

    /** @var list<string> */
    protected $fillable = [
        'name',
        'slug',
        'category_id',
        'description',
        'operating_hours',
        'phone',
        'image_path',
        'is_open',
        'floor_location',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'category_id' => 'integer',
            'is_open' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(StoreImage::class)->orderBy('sort_order')->orderBy('id');
    }

    public function highlights(): HasMany
    {
        return $this->hasMany(StoreHighlight::class)->orderBy('sort_order')->orderBy('id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function availabilityLabel(): string
    {
        return $this->is_open ? 'Open' : 'Close';
    }

    public function scopeSearch(Builder $query, mixed $term): void
    {
        if (! is_string($term) || trim($term) === '') {
            return;
        }

        $term = trim($term);

        $query->where(function (Builder $query) use ($term): void {
            $query->where('name', 'like', "%{$term}%")
                ->orWhere('description', 'like', "%{$term}%");
        });
    }

    /**
     * Filter by a store category slug (or numeric id), including child categories.
     */
    public function scopeFilterCategory(Builder $query, mixed $category): void
    {
        if (! is_string($category) || trim($category) === '') {
            return;
        }

        $category = trim($category);

        $model = Category::query()
            ->where('type', Category::TYPE_STORE)
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
}
