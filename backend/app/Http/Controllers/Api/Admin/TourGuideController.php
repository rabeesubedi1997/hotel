<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TourGuide;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TourGuideController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = TourGuide::query();
        
        if ($request->has('active_only')) {
            $query->active();
        }
        
        if ($request->has('available_only')) {
            $query->available();
        }
        
        $guides = $query->ordered()->get();
        
        return response()->json($guides);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|unique:tour_guides,slug',
            'image' => 'nullable|string',
            'role' => 'nullable|string|max:255',
            'bio' => 'nullable|string',
            'trips_completed' => 'nullable|integer|min:0',
            'rating' => 'nullable|numeric|min:0|max:5',
            'total_reviews' => 'nullable|integer|min:0',
            'is_available_for_hire' => 'boolean',
            'hire_price_per_day' => 'nullable|numeric|min:0',
            'languages' => 'nullable|array',
            'specialties' => 'nullable|array',
            'certifications' => 'nullable|array',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $guide = TourGuide::create($validated);

        return response()->json([
            'message' => 'Tour guide created successfully',
            'guide' => $guide,
        ], 201);
    }

    public function show(TourGuide $tourGuide): JsonResponse
    {
        return response()->json($tourGuide);
    }

    public function update(Request $request, TourGuide $tourGuide): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'nullable|string|unique:tour_guides,slug,' . $tourGuide->id,
            'image' => 'nullable|string',
            'role' => 'nullable|string|max:255',
            'bio' => 'nullable|string',
            'trips_completed' => 'nullable|integer|min:0',
            'rating' => 'nullable|numeric|min:0|max:5',
            'total_reviews' => 'nullable|integer|min:0',
            'is_available_for_hire' => 'boolean',
            'hire_price_per_day' => 'nullable|numeric|min:0',
            'languages' => 'nullable|array',
            'specialties' => 'nullable|array',
            'certifications' => 'nullable|array',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $tourGuide->update($validated);

        return response()->json([
            'message' => 'Tour guide updated successfully',
            'guide' => $tourGuide,
        ]);
    }

    public function destroy(TourGuide $tourGuide): JsonResponse
    {
        $tourGuide->delete();

        return response()->json([
            'message' => 'Tour guide deleted successfully',
        ]);
    }

    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $file = $request->file('image');
        $path = $file->store('tour-guides', 'public');
        $url = asset('storage/' . $path);

        return response()->json([
            'url' => $url,
            'path' => $path,
        ]);
    }

    public function getBookings(Request $request): JsonResponse
    {
        $bookings = \App\Models\TourGuideBooking::with(['tourGuide', 'user'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($bookings);
    }

    public function updateBookingStatus(Request $request, $bookingId): JsonResponse
    {
        $booking = \App\Models\TourGuideBooking::findOrFail($bookingId);
        
        $validated = $request->validate([
            'status' => 'required|in:pending,confirmed,completed,cancelled',
            'admin_notes' => 'nullable|string',
        ]);

        $updateData = [
            'status' => $validated['status'],
            'admin_notes' => $validated['admin_notes'] ?? $booking->admin_notes,
        ];

        if ($validated['status'] === 'confirmed' && !$booking->confirmed_at) {
            $updateData['confirmed_at'] = now();
        }

        if ($validated['status'] === 'completed' && !$booking->completed_at) {
            $updateData['completed_at'] = now();
            
            // Increment trips completed for the guide
            $booking->tourGuide->increment('trips_completed');
        }

        $booking->update($updateData);

        return response()->json([
            'message' => 'Booking status updated',
            'booking' => $booking->fresh(),
        ]);
    }
}
