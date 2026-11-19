<?php

namespace App\Http\Responses;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

/**
 * Single response envelope used by every API controller:
 *   success: { "data": ..., "message"?: "..." }
 *   list:    { "data": [...], "meta": { current_page, last_page, per_page, total } }
 */
trait ApiResponse
{
    protected function ok(mixed $data = null, ?string $message = null, int $status = 200): JsonResponse
    {
        $payload = ['data' => $data];

        if ($message !== null) {
            $payload['message'] = $message;
        }

        return response()->json($payload, $status);
    }

    protected function created(mixed $data = null, ?string $message = null): JsonResponse
    {
        return $this->ok($data, $message, 201);
    }

    protected function noContent(?string $message = null): JsonResponse
    {
        return $this->ok(null, $message, 200);
    }

    /**
     * @param  array<int, mixed>  $items  already-serialized resources
     */
    protected function paginated(LengthAwarePaginator $paginator, array $items, ?string $message = null): JsonResponse
    {
        $payload = [
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ];

        if ($message !== null) {
            $payload['message'] = $message;
        }

        return response()->json($payload);
    }

    protected function fail(string $message, int $status = 400, ?string $code = null, array $errors = []): JsonResponse
    {
        $payload = ['message' => $message];

        if ($code !== null) {
            $payload['code'] = $code;
        }

        if ($errors !== []) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }
}
