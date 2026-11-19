<?php

namespace App\Http\Requests\Product;

use App\Http\Requests\Catalog\ValidatesCatalogImages;
use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CreateProductRequest extends FormRequest
{
    use ValidatesCatalogImages;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        // The legacy worker UI submits `stocks`; the API contract uses `stock`.
        if (! $this->has('stock') && $this->has('stocks')) {
            $merge['stock'] = $this->input('stocks');
        }

        // The legacy worker UI submits a flat category name/slug; resolve it.
        if (! $this->has('category_id') && $this->filled('category')) {
            $category = Category::query()
                ->where('type', Category::TYPE_PRODUCT)
                ->where(function ($query): void {
                    $value = (string) $this->input('category');
                    $query->where('slug', Str::slug($value))->orWhere('name', $value);
                })
                ->first();

            if ($category !== null) {
                $merge['category_id'] = $category->id;
            }
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'category_id' => [
                'required',
                'integer',
                Rule::exists('categories', 'id')->where('type', Category::TYPE_PRODUCT),
            ],
            'store_id' => [
                'nullable',
                'integer',
                Rule::exists('stores', 'id')->whereNull('deleted_at'),
            ],
            'sku' => ['nullable', 'string', 'max:40', Rule::unique('products', 'sku')],
            'description' => ['nullable', 'string', 'max:5000'],
            'price' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'original_price' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'stock' => ['required', 'integer', 'min:0'],
            'is_new' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'images' => ['nullable', 'array', 'max:3'],
            'images.*' => $this->catalogImageRules(),
        ];
    }
}
