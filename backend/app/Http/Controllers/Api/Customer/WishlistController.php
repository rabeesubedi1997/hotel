<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\Wishlist;
use App\Models\Hotel;
use App\Models\Activity;

class WishlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $wishlistItems = Wishlist::where('user_id', $request->user()->id)
            ->with(['hotel', 'activity'])
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($wishlistItems);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required|in:hotel,activity',
            'item_id' => 'required|integer',
        ]);

        $user = $request->user();
        
        // Validate item exists
        if ($request->type === 'hotel') {
            $item = Hotel::findOrFail($request->item_id);
        } else {
            $item = Activity::findOrFail($request->item_id);
        }

        // Check if item already in wishlist
        $existingItem = Wishlist::where('user_id', $user->id)
            ->where($request->type === 'hotel' ? 'hotel_id' : 'activity_id', $request->item_id)
            ->first();

        if ($existingItem) {
            return response()->json([
                'message' => 'Item already in wishlist'
            ], 422);
        }

        $wishlistItem = Wishlist::create([
            'user_id' => $user->id,
            'type' => $request->type,
            'hotel_id' => $request->type === 'hotel' ? $request->item_id : null,
            'activity_id' => $request->type === 'activity' ? $request->item_id : null,
        ]);

        return response()->json([
            'message' => 'Item added to wishlist successfully',
            'wishlist_item' => $wishlistItem->load(['hotel', 'activity'])
        ], 201);
    }

    public function destroy(Request $request, Wishlist $wishlist): JsonResponse
    {
        // Ensure user can only delete their own wishlist items
        if ($wishlist->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $wishlist->delete();

        return response()->json([
            'message' => 'Item removed from wishlist successfully'
        ]);
    }
}
