<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Itinerary;
use App\Models\ItineraryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Personal trip planner — lets a logged-in customer build their own
 * day-by-day itinerary out of existing hotels/activities/tour guides, then
 * book the items in it. Mirrors the ownership-check pattern used by the
 * top-level BookingController (a user may only see/edit their own trips).
 */
class TripPlanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $trips = Itinerary::personal()
            ->where('user_id', $request->user()->id)
            ->withCount('items')
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json($trips);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'duration_days' => 'nullable|integer|min:1|max:60',
        ]);

        $trip = Itinerary::create([
            ...$validated,
            'type' => Itinerary::TYPE_PERSONAL,
            'user_id' => $request->user()->id,
            'is_public' => false,
            'status' => Itinerary::STATUS_DRAFT,
            'duration_days' => $validated['duration_days'] ?? 1,
        ]);

        return response()->json([
            'message' => 'Trip created successfully.',
            'trip' => $trip,
        ], 201);
    }

    public function show(Request $request, Itinerary $itinerary): JsonResponse
    {
        $this->authorizeOwner($request, $itinerary);

        $itinerary->load('items.bookable');

        return response()->json($itinerary);
    }

    public function update(Request $request, Itinerary $itinerary): JsonResponse
    {
        $this->authorizeOwner($request, $itinerary);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'duration_days' => 'sometimes|integer|min:1|max:60',
        ]);

        $itinerary->update($validated);

        return response()->json([
            'message' => 'Trip updated successfully.',
            'trip' => $itinerary,
        ]);
    }

    public function destroy(Request $request, Itinerary $itinerary): JsonResponse
    {
        $this->authorizeOwner($request, $itinerary);

        $itinerary->delete();

        return response()->json(['message' => 'Trip deleted successfully.']);
    }

    public function addItem(Request $request, Itinerary $itinerary): JsonResponse
    {
        $this->authorizeOwner($request, $itinerary);

        $validated = $request->validate([
            'bookable_type' => 'required|string|in:hotel,activity,tour_guide',
            'bookable_id' => 'required|integer',
            'day_number' => 'nullable|integer|min:1',
            'notes' => 'nullable|string',
        ]);

        $bookableClass = ItineraryItem::classForType($validated['bookable_type']);
        if (!$bookableClass || !$bookableClass::find($validated['bookable_id'])) {
            return response()->json(['message' => 'Item not found.'], 404);
        }

        $dayNumber = $validated['day_number'] ?? 1;
        $nextSortOrder = $itinerary->items()->where('day_number', $dayNumber)->max('sort_order');

        $item = $itinerary->items()->create([
            'bookable_type' => $bookableClass,
            'bookable_id' => $validated['bookable_id'],
            'day_number' => $dayNumber,
            'sort_order' => ($nextSortOrder ?? -1) + 1,
            'notes' => $validated['notes'] ?? null,
        ]);

        // Keep the trip's duration in sync with the furthest day used, so a
        // customer adding a "day 5" item doesn't leave duration_days at 1.
        if ($dayNumber > $itinerary->duration_days) {
            $itinerary->update(['duration_days' => $dayNumber]);
        }

        return response()->json([
            'message' => 'Item added to trip.',
            'item' => $item->load('bookable'),
        ], 201);
    }

    public function updateItem(Request $request, Itinerary $itinerary, ItineraryItem $item): JsonResponse
    {
        $this->authorizeOwner($request, $itinerary);
        $this->authorizeItemBelongsToTrip($itinerary, $item);

        $validated = $request->validate([
            'day_number' => 'sometimes|integer|min:1',
            'sort_order' => 'sometimes|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        $item->update($validated);

        return response()->json([
            'message' => 'Item updated.',
            'item' => $item->load('bookable'),
        ]);
    }

    public function removeItem(Request $request, Itinerary $itinerary, ItineraryItem $item): JsonResponse
    {
        $this->authorizeOwner($request, $itinerary);
        $this->authorizeItemBelongsToTrip($itinerary, $item);

        $item->delete();

        return response()->json(['message' => 'Item removed from trip.']);
    }

    private function authorizeOwner(Request $request, Itinerary $itinerary): void
    {
        if ($itinerary->type !== Itinerary::TYPE_PERSONAL || $itinerary->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized.');
        }
    }

    private function authorizeItemBelongsToTrip(Itinerary $itinerary, ItineraryItem $item): void
    {
        if ($item->itinerary_id !== $itinerary->id) {
            abort(404, 'Item not found on this trip.');
        }
    }
}
