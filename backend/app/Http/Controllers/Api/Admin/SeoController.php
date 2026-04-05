<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SeoSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SeoController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = SeoSetting::all();
        return response()->json($settings);
    }

    public function show(string $page): JsonResponse
    {
        $setting = SeoSetting::where('page', $page)->first();
        
        if (!$setting) {
            return response()->json([
                'page' => $page,
                'title' => null,
                'description' => null,
                'keywords' => null,
                'og_image' => null,
                'canonical' => null,
                'noindex' => false,
                'json_ld' => null,
            ]);
        }
        
        return response()->json($setting);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page' => 'required|string|unique:seo_settings,page',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'keywords' => 'nullable|string',
            'og_image' => 'nullable|string',
            'canonical' => 'nullable|string',
            'noindex' => 'boolean',
            'json_ld' => 'nullable|json',
        ]);

        $setting = SeoSetting::create($validated);

        return response()->json([
            'message' => 'SEO setting created successfully',
            'data' => $setting
        ], 201);
    }

    public function update(Request $request, string $page): JsonResponse
    {
        $setting = SeoSetting::where('page', $page)->first();

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'keywords' => 'nullable|string',
            'og_image' => 'nullable|string',
            'canonical' => 'nullable|string',
            'noindex' => 'boolean',
            'json_ld' => 'nullable',
        ]);

        if ($setting) {
            $setting->update($validated);
        } else {
            $validated['page'] = $page;
            $setting = SeoSetting::create($validated);
        }

        return response()->json([
            'message' => 'SEO setting updated successfully',
            'data' => $setting
        ]);
    }

    public function destroy(string $page): JsonResponse
    {
        $setting = SeoSetting::where('page', $page)->firstOrFail();
        $setting->delete();

        return response()->json([
            'message' => 'SEO setting deleted successfully'
        ]);
    }

    public function getPublicSettings(): JsonResponse
    {
        $settings = SeoSetting::where('noindex', false)->get();
        return response()->json($settings);
    }
}
