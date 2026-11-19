<?php

namespace App\Http\Requests\Product;

use App\Http\Requests\Catalog\ValidatesCatalogImages;
use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    use ValidatesCatalogImages;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        if (! $this->has('stock') && $this->has('stocks')) {
            $merge['stock'] = $this->input('stocks');
        }

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
        $productId = $this->route('product')?->id ?? $this->route('product');
        $productId = is_numeric($productId) ? (int) $productId : null;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:160'],
            'category_id' => [
                'sometimes',
                'required',
                'integer',
                Rule::exists('categories', 'id')->where('type', Category::TYPE_PRODUCT),
            ],
            'store_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('stores', 'id')->whereNull('deleted_at'),
            ],
            'sku' => [
                'sometimes',
                'nullable',
                'string',
                'max:40',
                Rule::unique('products', 'sku')->ignore($productId),
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0', 'max:99999999.99'],
            'original_price' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'stock' => ['sometimes', 'required', 'integer', 'min:0'],
            'is_new' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'images' => ['sometimes', 'nullable', 'array', 'max:3'],
            'images.*' => $this->catalogImageRules(),
            'remove_image_ids' => ['sometimes', 'nullable', 'array', 'max:3'],
            'remove_image_ids.*' => [
                'integer',
                $productId !== null
                    ? Rule::exists('product_images', 'id')->where('product_id', $productId)
                    : Rule::exists('product_images', 'id'),
            ],
        ];
    }
}
