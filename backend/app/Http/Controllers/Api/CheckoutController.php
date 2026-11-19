<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Order\CheckoutRequest;
use App\Http\Resources\Commerce\OrderResource;
use App\Services\CheckoutService;
use Illuminate\Http\JsonResponse;

/**
 * POST /api/checkout — atomic conversion of selected cart lines into a pending
 * order (§5, §6.4). Prices/stock are always recomputed from the database.
 */
class CheckoutController extends Controller
{
    public function __invoke(CheckoutRequest $request, CheckoutService $checkout): JsonResponse
    {
        $order = $checkout->checkout(
            $request->user(),
            $request->itemIds(),
            $request->boolean('select_all'),
        );

        return $this->created(
            (new OrderResource($order))->resolve(),
            'Checkout successful! Order placed.',
        );
    }
}
