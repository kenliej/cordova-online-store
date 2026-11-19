<?php

namespace App\Http\Requests\Order;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
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
            'item_ids' => ['nullable', 'array'],
            'item_ids.*' => ['integer', 'min:1'],
            'select_all' => ['nullable', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('item_ids') && $this->has('itemIds')) {
            $this->merge(['item_ids' => $this->input('itemIds')]);
        }

        if (! $this->has('select_all') && $this->has('selectAll')) {
            $this->merge(['select_all' => $this->input('selectAll')]);
        }
    }

    /**
     * @return array<int, int>
     */
    public function itemIds(): array
    {
        return array_map('intval', (array) $this->input('item_ids', []));
    }
}
