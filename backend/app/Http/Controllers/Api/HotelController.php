<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hotel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HotelController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Hotel::active()->approved();

        if ($request->has('lat') && $request->has('lng')) {
            $radius = $request->get('radius', 50); // Default 50km
            $query->nearLocation($request->lat, $request->lng, $radius);
        }

        if ($request->has('city')) {
            $query->where('city', $request->city);
        }

        if ($request->has('min_price')) {
            $query->where('price_per_night', '>=', $request->min_price);
        }

        if ($request->has('max_price')) {
            $query->where('price_per_night', '<=', $request->max_price);
        }

        if ($request->has('star_rating')) {
            $query->where('star_rating', $request->star_rating);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        // Filter by amenities (JSON column)
        if ($request->has('amenities')) {
            $amenities = is_array($request->amenities) ? $request->amenities : explode(',', $request->amenities);
            foreach ($amenities as $amenity) {
                $query->whereJsonContains('amenities', $amenity);
            }
        }

        // Filter by minimum rating
        if ($request->has('min_rating')) {
            $query->where('rating', '>=', $request->min_rating);
        }

        $hotels = $query->with(['rooms' => function ($q) {
            $q->available();
        }])->paginate($request->get('per_page', 12));

        return response()->json($hotels);
    }

    public function featured(): JsonResponse
    {
        $hotels = Hotel::featured()
            ->with('rooms')
            ->take(6)
            ->get();

        return response()->json($hotels);
    }

    public function show(Hotel $hotel): JsonResponse
    {
        $hotel->load([
            'rooms' => function ($q) {
                $q->where('status', 'available');
            },
            'reviews' => function ($q) {
                $q->where('status', 'approved')->with('user');
            },
            'user' => function ($q) {
                $q->select(['id', 'name', 'slug', 'company_name', 'avatar'])
                    ->where('role', 'vendor')
                    ->where('status', 'active');
            },
        ]);

        return response()->json($hotel);
    }

    public function cities(): JsonResponse
    {
        $cities = Hotel::active()
            ->distinct()
            ->pluck('city')
            ->sort()
            ->values();

        return response()->json($cities);
    }

    // City shortcut cards (Home/Hotels destination bands) — one row per
    // city with its cheapest active listing, so the card can show a
    // real "From $X" price instead of a flat placeholder.
    public function destinations(): JsonResponse
    {
        $destinations = Hotel::active()->approved()
            ->selectRaw('city, MIN(price_per_night) as price_from, COUNT(*) as listings_count')
            ->groupBy('city')
            ->orderByDesc('listings_count')
            ->get();

        return response()->json($destinations);
    }

    public function filters(): JsonResponse
    {
        $minPrice = Hotel::active()->min('price_per_night') ?? 0;
        $maxPrice = Hotel::active()->max('price_per_night') ?? 1000;

        // Fetch all unique amenities
        $allAmenities = Hotel::active()
            ->whereNotNull('amenities')
            ->pluck('amenities')
            ->map(function ($amenities) {
                return is_string($amenities) ? json_decode($amenities, true) : $amenities;
            })
            ->flatten()
            ->filter()
            ->unique()
            ->values();

        return response()->json([
            'min_price' => $minPrice,
            'max_price' => $maxPrice,
            'amenities' => $allAmenities
        ]);
    }
}
