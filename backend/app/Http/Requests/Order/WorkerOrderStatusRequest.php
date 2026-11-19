<?php

namespace App\Http\Requests\Order;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class WorkerOrderStatusRequest extends FormRequest
{
    /** UI label → machine value ("Ready to Claim" etc. are what the old UI sends). */
    private const STATUS_ALIASES = [
        'ready' => 'ready',
        'ready to claim' => 'ready',
        'claimed' => 'claimed',
        'cancelled' => 'cancelled',
        'canceled' => 'cancelled',
        'not_claimed' => 'not_claimed',
        'not claimed' => 'not_claimed',
        "didn't claimed" => 'not_claimed',
        'didnt claimed' => 'not_claimed',
    ];

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::in(['ready', 'claimed', 'not_claimed', 'cancelled'])],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $raw = $this->input('status');

        if (! is_string($raw)) {
            return;
        }

        $key = strtolower(trim($raw));
        $normalized = self::STATUS_ALIASES[$key] ?? null;

        if ($normalized !== null) {
            $this->merge(['status' => $normalized]);
        }
    }
}
