<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Hotel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class HotelController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Hotel::with('rooms');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        $hotels = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($hotels);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'address' => 'required|string',
            'city' => 'required|string',
            'district' => 'required|string',
            'price_per_night' => 'required|numeric|min:0',
            'star_rating' => 'required|integer|min:1|max:5',
            'amenities' => 'nullable|array',
            'images' => 'nullable|array',
            'featured_image' => 'nullable|string',
            'is_featured' => 'boolean',
            'show_in_banner' => 'boolean',
            'banner_order' => 'integer|min:0',
            'status' => 'in:active,inactive,maintenance',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'policies' => 'nullable|string',
        ]);

        $validated['slug'] = Str::slug($validated['name']) . '-' . uniqid();

        $hotel = Hotel::create($validated);

        return response()->json([
            'hotel' => $hotel,
            'message' => 'Hotel created successfully.',
        ], 201);
    }

    public function show(Hotel $hotel): JsonResponse
    {
        $hotel->load('rooms');

        return response()->json($hotel);
    }

    public function update(Request $request, Hotel $hotel): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'address' => 'sometimes|string',
            'city' => 'sometimes|string',
            'district' => 'sometimes|string',
            'price_per_night' => 'sometimes|numeric|min:0',
            'star_rating' => 'sometimes|integer|min:1|max:5',
            'amenities' => 'nullable|array',
            'images' => 'nullable|array',
            'featured_image' => 'nullable|string',
            'is_featured' => 'boolean',
            'show_in_banner' => 'boolean',
            'banner_order' => 'integer|min:0',
            'status' => 'in:active,inactive,maintenance',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'policies' => 'nullable|string',
        ]);

        if (isset($validated['name']) && $validated['name'] !== $hotel->name) {
            $validated['slug'] = Str::slug($validated['name']) . '-' . uniqid();
        }

        $hotel->update($validated);

        return response()->json([
            'hotel' => $hotel,
            'message' => 'Hotel updated successfully.',
        ]);
    }

    public function destroy(Hotel $hotel): JsonResponse
    {
        $hotel->delete();

        return response()->json([
            'message' => 'Hotel deleted successfully.',
        ]);
    }

    public function toggleFeatured(Hotel $hotel): JsonResponse
    {
        $hotel->update(['is_featured' => !$hotel->is_featured]);

        return response()->json([
            'hotel' => $hotel,
            'message' => 'Hotel featured status updated.',
        ]);
    }

    public function toggleBanner(Hotel $hotel): JsonResponse
    {
        $hotel->update(['show_in_banner' => !$hotel->show_in_banner]);

        return response()->json([
            'hotel' => $hotel,
            'message' => 'Hotel banner status updated.',
        ]);
    }

    public function updateBannerOrder(Request $request, Hotel $hotel): JsonResponse
    {
        $validated = $request->validate([
            'banner_order' => 'required|integer|min:0',
        ]);

        $hotel->update(['banner_order' => $validated['banner_order']]);

        return response()->json([
            'hotel' => $hotel,
            'message' => 'Banner order updated.',
        ]);
    }

    public function getBannerItems(): JsonResponse
    {
        $hotels = Hotel::where('show_in_banner', true)
            ->where('status', 'active')
            ->orderBy('banner_order', 'asc')
            ->select(['id', 'name', 'slug', 'description', 'city', 'price_per_night', 'featured_image', 'banner_order', 'show_in_banner'])
            ->get();

        return response()->json($hotels);
    }
}
