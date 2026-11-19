<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\ProductListRequest;
use App\Http\Resources\Catalog\ProductDetailResource;
use App\Http\Resources\Catalog\ProductSummaryResource;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

class ProductController extends Controller
{
    /**
     * GET /api/products
     *
     * Filters: category (slug/id), search (name/description LIKE),
     * sort=price_asc|price_desc|newest, in_stock=1, out_of_stock=1, per_page≤50.
     */
    public function index(ProductListRequest $request): JsonResponse
    {
        $query = Product::query()
            ->active()
            ->with(['images', 'category.parent', 'store']);

        $query->filterCategory($request->validated('category'));
        $query->search($request->validated('search'));
        $this->applyAvailability($query, $request);
        $query->sorted($request->validated('sort'));

        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));
        $paginator = $query->paginate($perPage);

        return $this->paginated(
            $paginator,
            ProductSummaryResource::collection($paginator->getCollection())->resolve($request),
        );
    }

    /**
     * GET /api/products/{slug}
     */
    public function show(Product $product): JsonResponse
    {
        abort_unless($product->is_active, 404);

        $product->load(['images', 'highlights', 'category.parent', 'store']);
        $product->setRelation('related', $this->relatedProducts($product));

        return $this->ok((new ProductDetailResource($product))->resolve(request()));
    }

    private function applyAvailability(Builder $query, ProductListRequest $request): void
    {
        if ($request->boolean('in_stock')) {
            $query->inStock();
        }

        if ($request->boolean('out_of_stock')) {
            $query->outOfStock();
        }
    }

    /**
     * @return Collection<int, Product>
     */
    private function relatedProducts(Product $product): Collection
    {
        if ($product->category_id === null) {
            return collect();
        }

        return Product::query()
            ->active()
            ->where('category_id', $product->category_id)
            ->whereKeyNot($product->getKey())
            ->with(['images', 'category.parent', 'store'])
            ->latest()
            ->limit(4)
            ->get();
    }
}
