<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Itinerary;
use App\Models\ItineraryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin management of curated itineraries (packages shown on the public
 * Itineraries page). Follows the same plain validate-then-create/update
 * shape as Admin\TourGuideController, and — like that controller's routes —
 * is not gated by the `permission:` middleware (see routes/api.php).
 */
class ItineraryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Itinerary::curated()->withCount('items');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $itineraries = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($itineraries);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|unique:itineraries,slug',
            'description' => 'nullable|string',
            'cover_image' => 'nullable|string',
            'duration_days' => 'required|integer|min:1|max:60',
            'price_from' => 'nullable|numeric|min:0',
            'fixed_price' => 'nullable|numeric|min:0',
            'max_travelers' => 'nullable|integer|min:1',
            'status' => 'nullable|in:draft,published',
            'is_public' => 'boolean',
        ]);

        $itinerary = Itinerary::create([
            ...$validated,
            'type' => Itinerary::TYPE_CURATED,
            'user_id' => null,
            'approval_status' => Itinerary::APPROVAL_STATUS_APPROVED,
        ]);

        return response()->json([
            'message' => 'Itinerary created successfully.',
            'itinerary' => $itinerary,
        ], 201);
    }

    public function show(Itinerary $itinerary): JsonResponse
    {
        $itinerary->load('items.bookable');

        return response()->json($itinerary);
    }

    public function update(Request $request, Itinerary $itinerary): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'slug' => 'nullable|string|unique:itineraries,slug,' . $itinerary->id,
            'description' => 'nullable|string',
            'cover_image' => 'nullable|string',
            'duration_days' => 'sometimes|integer|min:1|max:60',
            'price_from' => 'nullable|numeric|min:0',
            'fixed_price' => 'nullable|numeric|min:0',
            'max_travelers' => 'nullable|integer|min:1',
            'status' => 'nullable|in:draft,published',
            'is_public' => 'boolean',
        ]);

        $itinerary->update($validated);

        return response()->json([
            'message' => 'Itinerary updated successfully.',
            'itinerary' => $itinerary,
        ]);
    }

    public function destroy(Itinerary $itinerary): JsonResponse
    {
        $itinerary->delete();

        return response()->json(['message' => 'Itinerary deleted successfully.']);
    }

    public function addItem(Request $request, Itinerary $itinerary): JsonResponse
    {
        $validated = $request->validate([
            'bookable_type' => 'required|string|in:hotel,activity,tour_guide',
            'bookable_id' => 'required|integer',
            'day_number' => 'required|integer|min:1',
            'sort_order' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        $bookableClass = ItineraryItem::classForType($validated['bookable_type']);
        if (!$bookableClass || !$bookableClass::find($validated['bookable_id'])) {
            return response()->json(['message' => 'Item not found.'], 404);
        }

        $nextSortOrder = $validated['sort_order']
            ?? (($itinerary->items()->where('day_number', $validated['day_number'])->max('sort_order') ?? -1) + 1);

        $item = $itinerary->items()->create([
            'bookable_type' => $bookableClass,
            'bookable_id' => $validated['bookable_id'],
            'day_number' => $validated['day_number'],
            'sort_order' => $nextSortOrder,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Item added.',
            'item' => $item->load('bookable'),
        ], 201);
    }

    public function updateItem(Request $request, Itinerary $itinerary, ItineraryItem $item): JsonResponse
    {
        if ($item->itinerary_id !== $itinerary->id) {
            return response()->json(['message' => 'Item not found on this itinerary.'], 404);
        }

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

    public function removeItem(Itinerary $itinerary, ItineraryItem $item): JsonResponse
    {
        if ($item->itinerary_id !== $itinerary->id) {
            return response()->json(['message' => 'Item not found on this itinerary.'], 404);
        }

        $item->delete();

        return response()->json(['message' => 'Item removed.']);
    }
}
