<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\StoreListRequest;
use App\Http\Requests\Store\CreateStoreRequest;
use App\Http\Requests\Store\UpdateStoreRequest;
use App\Http\Resources\Catalog\StoreDetailResource;
use App\Http\Resources\Catalog\StoreSummaryResource;
use App\Models\Store;
use App\Support\AuditLogger;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StoreController extends Controller
{
    /**
     * GET /api/admin/stores — paginated, searchable by name, filterable by
     * category and open/closed. Soft-deleted stores are always excluded.
     */
    public function index(StoreListRequest $request): JsonResponse
    {
        Gate::authorize('viewAny', Store::class);

        $query = Store::query()->with('category.parent');

        $query->filterCategory($request->validated('category'));
        $query->search($request->validated('search'));

        if ($request->boolean('open')) {
            $query->where('is_open', true);
        }

        if ($request->boolean('closed')) {
            $query->where('is_open', false);
        }

        if ($request->has('is_open')) {
            $query->where('is_open', $request->boolean('is_open'));
        }

        $query->orderByDesc('is_open')->orderBy('name');

        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));
        $paginator = $query->paginate($perPage);

        return $this->paginated(
            $paginator,
            StoreSummaryResource::collection($paginator->getCollection())->resolve($request),
        );
    }

    /**
     * POST /api/admin/stores (multipart, optional `image` ≤5MB JPG/PNG/WEBP).
     */
    public function store(CreateStoreRequest $request): JsonResponse
    {
        Gate::authorize('create', Store::class);

        $data = $request->validated();
        unset($data['image']);

        $data['slug'] = $this->uniqueSlug($data['name']);
        $data['operating_hours'] = $data['operating_hours'] ?? '6:00AM - 11:00PM';
        $data['is_open'] = $request->has('is_open') ? $request->boolean('is_open') : true;
        $data['image_path'] = $this->storeImage($request);

        $store = Store::query()->create($data);

        AuditLogger::log('store.created', $store, [
            'name' => $store->name,
            'slug' => $store->slug,
        ]);

        $store->load(['category.parent', 'images', 'highlights']);

        return $this->created(
            (new StoreDetailResource($store))->resolve($request),
            'Store created.',
        );
    }

    /**
     * GET /api/admin/stores/{store}
     */
    public function show(Store $store): JsonResponse
    {
        Gate::authorize('view', $store);

        $store->load(['category.parent', 'images', 'highlights']);

        return $this->ok((new StoreDetailResource($store))->resolve(request()));
    }

    /**
     * PATCH /api/admin/stores/{store} (multipart with `_method=PATCH` supported).
     */
    public function update(UpdateStoreRequest $request, Store $store): JsonResponse
    {
        Gate::authorize('update', $store);

        $data = $request->validated();
        unset($data['image']);

        if (isset($data['name']) && $data['name'] !== $store->name) {
            $data['slug'] = $this->uniqueSlug($data['name'], $store->getKey());
        }

        if (array_key_exists('is_open', $data)) {
            $data['is_open'] = $request->boolean('is_open');
        }

        if (array_key_exists('operating_hours', $data) && $data['operating_hours'] === null) {
            $data['operating_hours'] = '6:00AM - 11:00PM';
        }

        $newImage = $this->storeImage($request);

        if ($newImage !== null) {
            $this->deleteImageFile($store->image_path);
            $data['image_path'] = $newImage;
        }

        $store->update($data);

        AuditLogger::log('store.updated', $store, [
            'name' => $store->name,
            'fields' => array_keys($data),
        ]);

        $store->load(['category.parent', 'images', 'highlights']);

        return $this->ok((new StoreDetailResource($store))->resolve($request), 'Store updated.');
    }

    /**
     * DELETE /api/admin/stores/{store} — soft delete.
     */
    public function destroy(Store $store): JsonResponse
    {
        Gate::authorize('delete', $store);

        $store->delete();

        AuditLogger::log('store.deleted', $store, [
            'name' => $store->name,
            'slug' => $store->slug,
        ]);

        return $this->ok(null, 'Store deleted.');
    }

    private function storeImage(FormRequest $request): ?string
    {
        $file = $request->file('image');

        if (! $file instanceof UploadedFile) {
            return null;
        }

        $path = $file->store('stores', 'public');

        return $path !== false ? $path : null;
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
        $base = $base !== '' ? $base : 'store';

        $slug = $base;
        $suffix = 2;

        while (Store::withTrashed()
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
