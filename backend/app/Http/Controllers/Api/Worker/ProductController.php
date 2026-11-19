<?php

namespace App\Http\Controllers\Api\Worker;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\CreateProductRequest;
use App\Http\Requests\Product\ProductListRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Http\Resources\Catalog\WorkerProductResource;
use App\Models\Product;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller
{
    /**
     * GET /api/worker/products — paginated inventory with category/search/
     * availability filters and whitelisted sorting.
     */
    public function index(ProductListRequest $request): JsonResponse
    {
        Gate::authorize('viewAny', Product::class);

        $query = Product::query()->with(['images', 'category.parent', 'store']);

        $query->filterCategory($request->validated('category'));
        $query->search($request->validated('search'));

        if ($request->boolean('in_stock')) {
            $query->inStock();
        }

        if ($request->boolean('out_of_stock')) {
            $query->outOfStock();
        }

        $query->sorted($request->validated('sort'));

        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));
        $paginator = $query->paginate($perPage);

        return $this->paginated(
            $paginator,
            WorkerProductResource::collection($paginator->getCollection())->resolve($request),
        );
    }

    /**
     * POST /api/worker/products (multipart `images[]` ≤3 or JSON image URLs).
     */
    public function store(CreateProductRequest $request): JsonResponse
    {
        Gate::authorize('create', Product::class);

        $data = $request->validated();
        $images = is_array($data['images'] ?? null) ? $data['images'] : [];
        unset($data['images']);

        $data['slug'] = $this->uniqueSlug($data['name']);
        $data['is_new'] = $request->has('is_new') ? $request->boolean('is_new') : false;
        $data['is_active'] = $request->has('is_active') ? $request->boolean('is_active') : true;
        $data['created_by'] = auth()->id();

        $product = DB::transaction(function () use ($data, $images): Product {
            $product = Product::query()->create($data);
            $this->storeImages($product, $images);

            return $product;
        });

        AuditLogger::log('product.created', $product, [
            'name' => $product->name,
            'slug' => $product->slug,
            'price' => (float) $product->price,
            'stock' => $product->stock,
        ]);

        $product->load(['images', 'category.parent', 'store']);

        return $this->created(
            (new WorkerProductResource($product))->resolve($request),
            'Product created.',
        );
    }

    /**
     * PATCH /api/worker/products/{product}
     *
     * Multipart clients send `_method=PATCH`; `remove_image_ids[]` removes
     * existing product images (files included) before adding `images[]`.
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        Gate::authorize('update', $product);

        $data = $request->validated();
        $newImages = is_array($data['images'] ?? null) ? $data['images'] : [];
        $removeIds = is_array($data['remove_image_ids'] ?? null)
            ? array_values(array_unique(array_map('intval', $data['remove_image_ids'])))
            : [];
        unset($data['images'], $data['remove_image_ids']);

        if (isset($data['name']) && $data['name'] !== $product->name) {
            $data['slug'] = $this->uniqueSlug($data['name'], $product->getKey());
        }

        if (array_key_exists('is_new', $data)) {
            $data['is_new'] = $request->boolean('is_new');
        }

        if (array_key_exists('is_active', $data)) {
            $data['is_active'] = $request->boolean('is_active');
        }

        $product = DB::transaction(function () use ($product, $data, $newImages, $removeIds): Product {
            $toRemove = $removeIds === []
                ? collect()
                : $product->images()->whereIn('id', $removeIds)->get();

            if ($product->images()->count() - $toRemove->count() + count($newImages) > 3) {
                throw ValidationException::withMessages([
                    'images' => ['A product may have at most 3 images.'],
                ]);
            }

            foreach ($toRemove as $image) {
                $this->deleteImageFile($image->path);
                $image->delete();
            }

            $product->update($data);
            $this->storeImages($product, $newImages);

            return $product;
        });

        AuditLogger::log('product.updated', $product, [
            'name' => $product->name,
            'fields' => array_keys($data),
            'removed_images' => count($removeIds),
        ]);

        $product->load(['images', 'category.parent', 'store']);

        return $this->ok((new WorkerProductResource($product))->resolve($request), 'Product updated.');
    }

    /**
     * DELETE /api/worker/products/{product} — soft delete.
     */
    public function destroy(Product $product): JsonResponse
    {
        Gate::authorize('delete', $product);

        $product->delete();

        AuditLogger::log('product.deleted', $product, [
            'name' => $product->name,
            'slug' => $product->slug,
        ]);

        return $this->ok(null, 'Product deleted.');
    }

    /**
     * @param  array<int, mixed>  $images
     */
    private function storeImages(Product $product, array $images): void
    {
        $sort = (int) $product->images()->max('sort_order');

        foreach ($images as $image) {
            $path = null;

            if ($image instanceof UploadedFile) {
                $stored = $image->store('products', 'public');
                $path = $stored !== false ? $stored : null;
            } elseif (is_string($image) && trim($image) !== '') {
                $path = trim($image);
            }

            if ($path === null) {
                continue;
            }

            $product->images()->create([
                'path' => $path,
                'sort_order' => ++$sort,
            ]);
        }
    }

    private function deleteImageFile(?string $path): void
    {
        if ($path === null || trim($path) === '' || preg_match('#^https?://#i', $path) === 1) {
            return;
        }

        Storage::disk('public')->delete($path);
    }

    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $base = $base !== '' ? $base : 'product';

        $slug = $base;
        $suffix = 2;

        while (Product::withTrashed()
            ->where('slug', $slug)
            ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists()
        ) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
