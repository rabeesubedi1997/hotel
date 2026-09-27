<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Itinerary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ItineraryController extends Controller
{
    /**
     * Public browse listing of published, admin-curated itineraries.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Itinerary::publiclyVisible()->withCount('items');

        if ($request->filled('min_days')) {
            $query->where('duration_days', '>=', (int) $request->min_days);
        }

        if ($request->filled('max_days')) {
            $query->where('duration_days', '<=', (int) $request->max_days);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $itineraries = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 12));

        return response()->json($itineraries);
    }

    /**
     * Public detail view of one published curated itinerary, with its
     * day-by-day items and each item's underlying hotel/activity/tour
     * guide eager-loaded.
     */
    public function show(Itinerary $itinerary): JsonResponse
    {
        if (
            $itinerary->type !== Itinerary::TYPE_CURATED
            || $itinerary->status !== Itinerary::STATUS_PUBLISHED
            || !$itinerary->is_public
            || $itinerary->approval_status !== Itinerary::APPROVAL_STATUS_APPROVED
        ) {
            return response()->json(['message' => 'Itinerary not found.'], 404);
        }

        $itinerary->load('items.bookable');

        return response()->json($itinerary);
    }
}
