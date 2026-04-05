<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Activity::query();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%");
            });
        }

        $activities = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($activities);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:bungee,paragliding,rafting,trekking,zipline,skydiving,canyoning,rock_climbing,hot_air_balloon,other',
            'location' => 'required|string',
            'city' => 'required|string',
            'duration' => 'required|string',
            'price' => 'required|numeric|min:0',
            'max_participants' => 'required|integer|min:1',
            'difficulty_level' => 'required|in:easy,moderate,challenging,extreme',
            'includes' => 'nullable|array',
            'images' => 'nullable|array',
            'featured_image' => 'nullable|string',
            'is_featured' => 'boolean',
            'show_in_banner' => 'boolean',
            'banner_order' => 'integer|min:0',
            'status' => 'in:active,inactive,seasonal',
            'requirements' => 'nullable|string',
            'safety_info' => 'nullable|string',
        ]);

        $validated['slug'] = Str::slug($validated['name']) . '-' . uniqid();

        $activity = Activity::create($validated);

        return response()->json([
            'activity' => $activity,
            'message' => 'Activity created successfully.',
        ], 201);
    }

    public function show(Activity $activity): JsonResponse
    {
        return response()->json($activity);
    }

    public function update(Request $request, Activity $activity): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'type' => 'sometimes|in:bungee,paragliding,rafting,trekking,zipline,skydiving,canyoning,rock_climbing,hot_air_balloon,other',
            'location' => 'sometimes|string',
            'city' => 'sometimes|string',
            'duration' => 'sometimes|string',
            'price' => 'sometimes|numeric|min:0',
            'max_participants' => 'sometimes|integer|min:1',
            'difficulty_level' => 'sometimes|in:easy,moderate,challenging,extreme',
            'includes' => 'nullable|array',
            'images' => 'nullable|array',
            'featured_image' => 'nullable|string',
            'is_featured' => 'boolean',
            'show_in_banner' => 'boolean',
            'banner_order' => 'integer|min:0',
            'status' => 'in:active,inactive,seasonal',
            'requirements' => 'nullable|string',
            'safety_info' => 'nullable|string',
        ]);

        if (isset($validated['name']) && $validated['name'] !== $activity->name) {
            $validated['slug'] = Str::slug($validated['name']) . '-' . uniqid();
        }

        $activity->update($validated);

        return response()->json([
            'activity' => $activity,
            'message' => 'Activity updated successfully.',
        ]);
    }

    public function destroy(Activity $activity): JsonResponse
    {
        $activity->delete();

        return response()->json([
            'message' => 'Activity deleted successfully.',
        ]);
    }

    public function toggleFeatured(Activity $activity): JsonResponse
    {
        $activity->update(['is_featured' => !$activity->is_featured]);

        return response()->json([
            'activity' => $activity,
            'message' => 'Activity featured status updated.',
        ]);
    }

    public function toggleBanner(Activity $activity): JsonResponse
    {
        $activity->update(['show_in_banner' => !$activity->show_in_banner]);

        return response()->json([
            'activity' => $activity,
            'message' => 'Activity banner status updated.',
        ]);
    }

    public function updateBannerOrder(Request $request, Activity $activity): JsonResponse
    {
        $validated = $request->validate([
            'banner_order' => 'required|integer|min:0',
        ]);

        $activity->update(['banner_order' => $validated['banner_order']]);

        return response()->json([
            'activity' => $activity,
            'message' => 'Banner order updated.',
        ]);
    }

    public function getBannerItems(): JsonResponse
    {
        $activities = Activity::where('show_in_banner', true)
            ->where('status', 'active')
            ->orderBy('banner_order', 'asc')
            ->select(['id', 'name', 'slug', 'description', 'city', 'location', 'price', 'featured_image', 'type', 'banner_order', 'show_in_banner'])
            ->get();

        return response()->json($activities);
    }
}
