<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Activity::active()->approved();

        if ($request->has('lat') && $request->has('lng')) {
            $radius = $request->get('radius', 50); // Default 50km
            $query->nearLocation($request->lat, $request->lng, $radius);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('city')) {
            $query->where('city', $request->city);
        }

        if ($request->has('difficulty_level')) {
            $query->where('difficulty_level', $request->difficulty_level);
        }

        if ($request->has('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }

        if ($request->has('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%");
            });
        }

        $activities = $query->paginate($request->get('per_page', 12));

        return response()->json($activities);
    }

    public function featured(): JsonResponse
    {
        $activities = Activity::featured()
            ->take(6)
            ->get();

        return response()->json($activities);
    }

    public function show(Activity $activity): JsonResponse
    {
        $activity->load([
            'reviews.approved.user',
            'user' => function ($q) {
                $q->select(['id', 'name', 'slug', 'company_name', 'avatar'])
                    ->where('role', 'vendor')
                    ->where('status', 'active');
            },
        ]);

        return response()->json($activity);
    }

    public function types(): JsonResponse
    {
        $types = [
            'bungee' => 'Bungee Jumping',
            'paragliding' => 'Paragliding',
            'rafting' => 'White Water Rafting',
            'trekking' => 'Trekking',
            'zipline' => 'Zip Flying',
            'skydiving' => 'Skydiving',
            'canyoning' => 'Canyoning',
            'rock_climbing' => 'Rock Climbing',
            'hot_air_balloon' => 'Hot Air Balloon',
            'other' => 'Other',
        ];

        return response()->json($types);
    }

    public function cities(): JsonResponse
    {
        $cities = Activity::active()
            ->distinct()
            ->pluck('city')
            ->sort()
            ->values();

        return response()->json($cities);
    }

    // City shortcut cards (Home/Activities destination bands) — one row per
    // city with its cheapest active listing, so the card can show a real
    // "From $X" price instead of a flat placeholder.
    public function destinations(): JsonResponse
    {
        $destinations = Activity::active()->approved()
            ->selectRaw('city, MIN(price) as price_from, COUNT(*) as listings_count')
            ->groupBy('city')
            ->orderByDesc('listings_count')
            ->get();

        return response()->json($destinations);
    }

    public function filters(): JsonResponse
    {
        $minPrice = Activity::active()->min('price') ?? 0;
        $maxPrice = Activity::active()->max('price') ?? 1000;

        // Fetch all unique includes
        $allIncludes = Activity::active()
            ->whereNotNull('includes')
            ->pluck('includes')
            ->map(function ($includes) {
                return is_string($includes) ? json_decode($includes, true) : $includes;
            })
            ->flatten()
            ->filter()
            ->unique()
            ->values();

        return response()->json([
            'min_price' => $minPrice,
            'max_price' => $maxPrice,
            'includes' => $allIncludes
        ]);
    }
}
