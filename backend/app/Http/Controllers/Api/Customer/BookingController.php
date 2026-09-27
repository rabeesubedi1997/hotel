<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\Booking;
use App\Models\Hotel;
use App\Models\Activity;

class BookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $bookings = Booking::where('user_id', $request->user()->id)
            ->with(['hotel', 'activity'])
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($bookings);
    }

    public function show(Request $request, Booking $booking): JsonResponse
    {
        // Ensure user can only view their own bookings
        if ($booking->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $booking->load(['hotel', 'activity', 'payment']);
        
        return response()->json($booking);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required|in:hotel,activity',
            'item_id' => 'required|integer',
            'check_in_date' => 'required|date',
            'check_out_date' => 'nullable|date|after:check_in_date',
            'guests' => 'required|integer|min:1',
            'total_amount' => 'required|numeric|min:0',
            'special_requests' => 'nullable|string',
        ]);

        $user = $request->user();
        
        // Validate item exists
        if ($request->type === 'hotel') {
            $item = Hotel::findOrFail($request->item_id);
        } else {
            $item = Activity::findOrFail($request->item_id);
        }

        $booking = Booking::create([
            'user_id' => $user->id,
            'type' => $request->type,
            'hotel_id' => $request->type === 'hotel' ? $request->item_id : null,
            'activity_id' => $request->type === 'activity' ? $request->item_id : null,
            'check_in_date' => $request->check_in_date,
            'check_out_date' => $request->check_out_date,
            'guests' => $request->guests,
            'total_amount' => $request->total_amount,
            'special_requests' => $request->special_requests,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Booking created successfully',
            'booking' => $booking->load(['hotel', 'activity'])
        ], 201);
    }

    public function cancel(Request $request, Booking $booking): JsonResponse
    {
        // Ensure user can only cancel their own bookings
        if ($booking->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Check if booking can be cancelled
        if (!in_array($booking->status, ['pending', 'confirmed'])) {
            return response()->json([
                'message' => 'Booking cannot be cancelled'
            ], 422);
        }

        $booking->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Booking cancelled successfully',
            'booking' => $booking
        ]);
    }
}
