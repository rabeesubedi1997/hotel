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
        $query = Activity::active();

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
        $activity->load(['reviews.approved.user']);

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
}
