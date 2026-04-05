<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Wishlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $wishlists = $request->user()
            ->wishlists()
            ->with('wishlistable')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 10));

        return response()->json($wishlists);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'wishlistable_type' => 'required|string|in:hotel,activity',
            'wishlistable_id' => 'required|integer',
        ]);

        $wishlistableClass = $request->wishlistable_type === 'hotel'
            ? \App\Models\Hotel::class
            : \App\Models\Activity::class;

        // Check if already in wishlist
        $existing = Wishlist::where('user_id', $request->user()->id)
            ->where('wishlistable_type', $wishlistableClass)
            ->where('wishlistable_id', $request->wishlistable_id)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Item is already in your wishlist.',
            ], 422);
        }

        $wishlist = Wishlist::create([
            'user_id' => $request->user()->id,
            'wishlistable_type' => $wishlistableClass,
            'wishlistable_id' => $request->wishlistable_id,
        ]);

        return response()->json([
            'wishlist' => $wishlist->load('wishlistable'),
            'message' => 'Added to wishlist successfully.',
        ], 201);
    }

    public function destroy(Wishlist $wishlist): JsonResponse
    {
        if ($wishlist->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $wishlist->delete();

        return response()->json([
            'message' => 'Removed from wishlist successfully.',
        ]);
    }

    public function check(Request $request): JsonResponse
    {
        $request->validate([
            'wishlistable_type' => 'required|string|in:hotel,activity',
            'wishlistable_id' => 'required|integer',
        ]);

        $wishlistableClass = $request->wishlistable_type === 'hotel'
            ? \App\Models\Hotel::class
            : \App\Models\Activity::class;

        $exists = Wishlist::where('user_id', $request->user()->id)
            ->where('wishlistable_type', $wishlistableClass)
            ->where('wishlistable_id', $request->wishlistable_id)
            ->exists();

        return response()->json([
            'in_wishlist' => $exists,
        ]);
    }
}
