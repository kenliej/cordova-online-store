<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\CategoryListRequest;
use App\Http\Resources\Catalog\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    /**
     * Flat category list for the product/store filter sidebars.
     *
     * GET /api/categories?type=product|store
     */
    public function index(CategoryListRequest $request): JsonResponse
    {
        $query = Category::query()->with('parent')->orderBy('sort_order')->orderBy('name');

        if ($request->filled('type')) {
            $query->where('type', $request->validated('type'));
        }

        if ($request->has('parent_id')) {
            $parentId = (int) $request->validated('parent_id');

            if ($parentId === 0) {
                $query->whereNull('parent_id');
            } else {
                $query->where('parent_id', $parentId);
            }
        }

        $categories = $query->get();

        return $this->ok(CategoryResource::collection($categories)->resolve($request));
    }
}
