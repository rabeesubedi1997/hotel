<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $reviews = Review::approved()
            ->with('user')
            ->when($request->has('reviewable_type'), function ($q) use ($request) {
                $q->where('reviewable_type', $request->reviewable_type);
            })
            ->when($request->has('reviewable_id'), function ($q) use ($request) {
                $q->where('reviewable_id', $request->reviewable_id);
            })
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 10));

        return response()->json($reviews);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'reviewable_type' => 'required|string|in:hotel,activity',
            'reviewable_id' => 'required|integer',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string',
            'images' => 'nullable|array',
        ]);

        $reviewableClass = $request->reviewable_type === 'hotel'
            ? \App\Models\Hotel::class
            : \App\Models\Activity::class;

        // Check if user already reviewed this item
        $existingReview = Review::where('user_id', $request->user()->id)
            ->where('reviewable_type', $reviewableClass)
            ->where('reviewable_id', $request->reviewable_id)
            ->first();

        if ($existingReview) {
            return response()->json([
                'message' => 'You have already reviewed this item.',
            ], 422);
        }

        $review = Review::create([
            'user_id' => $request->user()->id,
            'reviewable_type' => $reviewableClass,
            'reviewable_id' => $request->reviewable_id,
            'rating' => $request->rating,
            'comment' => $request->comment,
            'images' => $request->images,
            'status' => Review::STATUS_PENDING,
        ]);

        return response()->json([
            'review' => $review->load('user'),
            'message' => 'Review submitted successfully and awaiting approval.',
        ], 201);
    }

    public function myReviews(Request $request): JsonResponse
    {
        $reviews = $request->user()
            ->reviews()
            ->with('reviewable')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 10));

        return response()->json($reviews);
    }
}
