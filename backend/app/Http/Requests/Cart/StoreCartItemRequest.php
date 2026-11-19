<?php

namespace App\Http\Requests\Cart;

use Illuminate\Foundation\Http\FormRequest;

class StoreCartItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'min:1'],
            'quantity' => ['sometimes', 'integer', 'min:1', 'max:999'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('product_id') && $this->has('productId')) {
            $this->merge(['product_id' => $this->input('productId')]);
        }
    }
}
