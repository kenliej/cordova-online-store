<?php

namespace App\Http\Requests\Store;

use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'category_id' => [
                'required',
                'integer',
                Rule::exists('categories', 'id')->where('type', Category::TYPE_STORE),
            ],
            'operating_hours' => ['nullable', 'string', 'max:60'],
            'phone' => ['required', 'string', 'max:20'],
            'is_open' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:5000'],
            'floor_location' => ['nullable', 'string', 'max:120'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }
}
