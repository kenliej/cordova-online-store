<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\StoreListRequest;
use App\Http\Resources\Catalog\StoreDetailResource;
use App\Http\Resources\Catalog\StoreSummaryResource;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class StoreController extends Controller
{
    /**
     * GET /api/stores
     *
     * Filters: category (slug/id), search (name/description LIKE), open=1, closed=1.
     */
    public function index(StoreListRequest $request): JsonResponse
    {
        $query = Store::query()->with('category.parent');

        $query->filterCategory($request->validated('category'));
        $query->search($request->validated('search'));
        $this->applyAvailability($query, $request);

        $query->orderByDesc('is_open')->orderBy('name');

        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));
        $paginator = $query->paginate($perPage);

        return $this->paginated(
            $paginator,
            StoreSummaryResource::collection($paginator->getCollection())->resolve($request),
        );
    }

    /**
     * GET /api/stores/{slug}
     */
    public function show(Store $store): JsonResponse
    {
        $store->load(['category.parent', 'images', 'highlights']);

        $products = Product::query()
            ->active()
            ->where('store_id', $store->getKey())
            ->with(['images', 'category.parent', 'store'])
            ->latest()
            ->limit(12)
            ->get();

        $store->setRelation('products', $products);

        return $this->ok((new StoreDetailResource($store))->resolve(request()));
    }

    private function applyAvailability(Builder $query, StoreListRequest $request): void
    {
        if ($request->boolean('open')) {
            $query->where('is_open', true);
        }

        if ($request->boolean('closed')) {
            $query->where('is_open', false);
        }

        if ($request->has('is_open')) {
            $query->where('is_open', $request->boolean('is_open'));
        }
    }
}
