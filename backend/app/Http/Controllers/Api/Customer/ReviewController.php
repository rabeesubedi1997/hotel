<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\Review;
use App\Models\Hotel;
use App\Models\Activity;

class ReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $reviews = Review::where('user_id', $request->user()->id)
            ->with(['hotel', 'activity'])
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($reviews);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required|in:hotel,activity',
            'item_id' => 'required|integer',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|min:10|max:1000',
        ]);

        $user = $request->user();
        
        // Validate item exists
        if ($request->type === 'hotel') {
            $item = Hotel::findOrFail($request->item_id);
        } else {
            $item = Activity::findOrFail($request->item_id);
        }

        // Check if user already reviewed this item
        $existingReview = Review::where('user_id', $user->id)
            ->where($request->type === 'hotel' ? 'hotel_id' : 'activity_id', $request->item_id)
            ->first();

        if ($existingReview) {
            return response()->json([
                'message' => 'You have already reviewed this item'
            ], 422);
        }

        $review = Review::create([
            'user_id' => $user->id,
            'type' => $request->type,
            'hotel_id' => $request->type === 'hotel' ? $request->item_id : null,
            'activity_id' => $request->type === 'activity' ? $request->item_id : null,
            'rating' => $request->rating,
            'comment' => $request->comment,
            'status' => 'approved', // Auto-approve customer reviews
        ]);

        return response()->json([
            'message' => 'Review created successfully',
            'review' => $review->load(['hotel', 'activity'])
        ], 201);
    }

    public function update(Request $request, Review $review): JsonResponse
    {
        // Ensure user can only edit their own reviews
        if ($review->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'rating' => 'sometimes|integer|min:1|max:5',
            'comment' => 'sometimes|string|min:10|max:1000',
        ]);

        $review->update($request->only(['rating', 'comment']));

        return response()->json([
            'message' => 'Review updated successfully',
            'review' => $review->load(['hotel', 'activity'])
        ]);
    }

    public function destroy(Request $request, Review $review): JsonResponse
    {
        // Ensure user can only delete their own reviews
        if ($review->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $review->delete();

        return response()->json([
            'message' => 'Review deleted successfully'
        ]);
    }
}
