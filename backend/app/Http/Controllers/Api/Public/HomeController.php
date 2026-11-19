<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\Catalog\ProductSummaryResource;
use App\Http\Resources\Catalog\StoreSummaryResource;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\JsonResponse;

class HomeController extends Controller
{
    /**
     * GET /api/home
     *
     * Single payload for the landing page: new arrivals, featured products,
     * store cards and catalog counters.
     */
    public function __invoke(): JsonResponse
    {
        $productRelations = ['images', 'category.parent', 'store'];

        $newArrivals = Product::query()
            ->active()
            ->with($productRelations)
            ->latest()
            ->limit(8)
            ->get();

        $featured = Product::query()
            ->active()
            ->inStock()
            ->with($productRelations)
            ->orderByDesc('is_new')
            ->latest()
            ->limit(8)
            ->get();

        $stores = Store::query()
            ->with('category.parent')
            ->orderByDesc('is_open')
            ->orderBy('name')
            ->limit(8)
            ->get();

        return $this->ok([
            'new_arrivals' => ProductSummaryResource::collection($newArrivals)->resolve(request()),
            'featured_products' => ProductSummaryResource::collection($featured)->resolve(request()),
            'stores' => StoreSummaryResource::collection($stores)->resolve(request()),
            'stats' => [
                'products' => Product::query()->active()->count(),
                'stores' => Store::query()->count(),
            ],
        ]);
    }
}
