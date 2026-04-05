<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Review::with(['user', 'reviewable']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('reviewable_type')) {
            $query->where('reviewable_type', $request->reviewable_type);
        }

        $reviews = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($reviews);
    }

    public function show(Review $review): JsonResponse
    {
        $review->load(['user', 'reviewable']);

        return response()->json($review);
    }

    public function approve(Review $review): JsonResponse
    {
        $review->approve();

        return response()->json([
            'review' => $review,
            'message' => 'Review approved successfully.',
        ]);
    }

    public function reject(Request $request, Review $review): JsonResponse
    {
        $review->update(['status' => Review::STATUS_REJECTED]);

        return response()->json([
            'review' => $review,
            'message' => 'Review rejected successfully.',
        ]);
    }

    public function destroy(Review $review): JsonResponse
    {
        $review->delete();

        return response()->json([
            'message' => 'Review deleted successfully.',
        ]);
    }
}
