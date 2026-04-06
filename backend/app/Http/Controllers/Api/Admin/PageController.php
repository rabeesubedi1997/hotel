<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Page;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PageController extends Controller
{
    public function index(): JsonResponse
    {
        $pages = Page::all(['id', 'slug', 'title', 'is_active', 'updated_at']);
        return response()->json($pages);
    }

    public function show(Page $page): JsonResponse
    {
        return response()->json($page);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'slug' => 'required|string|unique:pages',
            'title' => 'required|string',
            'meta_description' => 'nullable|string',
            'sections' => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        $page = Page::create($validated);

        return response()->json([
            'message' => 'Page created successfully',
            'page' => $page,
        ], 201);
    }

    public function update(Request $request, Page $page): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'meta_description' => 'nullable|string',
            'sections' => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        $page->update($validated);

        return response()->json([
            'message' => 'Page updated successfully',
            'page' => $page,
        ]);
    }

    public function destroy(Page $page): JsonResponse
    {
        $page->delete();

        return response()->json([
            'message' => 'Page deleted successfully',
        ]);
    }

    // Public endpoint - no auth required
    public function showBySlug(Request $request, $slug): JsonResponse
    {
        $page = Page::where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        return response()->json($page);
    }
}
