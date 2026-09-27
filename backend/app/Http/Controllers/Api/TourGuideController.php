<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TourGuide;
use App\Models\TourGuideBooking;
use App\Notifications\NewTourGuideBookingRequest;
use App\Services\BookingAlertService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;

class TourGuideController extends Controller
{
    public function __construct(private BookingAlertService $alerts)
    {
    }

    public function index(): JsonResponse
    {
        $guides = TourGuide::active()
            ->available()
            ->approved()
            ->ordered()
            ->get();

        return response()->json($guides);
    }

    public function show(TourGuide $tourGuide): JsonResponse
    {
        if (!$tourGuide->is_active) {
            return response()->json(['message' => 'Tour guide not found'], 404);
        }

        $tourGuide->load(['vendor' => function ($q) {
            $q->select(['id', 'name', 'slug', 'company_name', 'avatar'])
                ->where('role', 'vendor')
                ->where('status', 'active');
        }]);

        return response()->json($tourGuide);
    }

    public function storeBooking(Request $request, TourGuide $tourGuide): JsonResponse
    {
        if (!$tourGuide->is_available_for_hire || !$tourGuide->is_active) {
            return response()->json(['message' => 'This tour guide is not available for hire'], 400);
        }

        $validated = $request->validate([
            'booking_date' => 'required|date|after_or_equal:today',
            'duration_days' => 'required|integer|min:1|max:30',
            'message' => 'nullable|string|max:1000',
        ]);

        // Calculate total price
        $totalPrice = null;
        if ($tourGuide->hire_price_per_day) {
            $totalPrice = $tourGuide->hire_price_per_day * $validated['duration_days'];
        }

        $booking = TourGuideBooking::create([
            'tour_guide_id' => $tourGuide->id,
            'user_id' => $request->user()->id,
            'booking_date' => $validated['booking_date'],
            'duration_days' => $validated['duration_days'],
            'message' => $validated['message'] ?? null,
            'total_price' => $totalPrice,
            'status' => 'pending',
            'response_due_at' => now()->addMinutes((int) config('booking.response_sla_minutes')),
        ]);

        Notification::send(
            $this->alerts->recipientsFor($tourGuide->vendor),
            new NewTourGuideBookingRequest($booking->load('tourGuide', 'user'))
        );

        return response()->json([
            'message' => 'Booking request sent successfully',
            'booking' => $booking->load('tourGuide'),
        ], 201);
    }

    public function myBookings(Request $request): JsonResponse
    {
        $bookings = TourGuideBooking::with('tourGuide')
            ->where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($bookings);
    }

    public function cancelBooking(Request $request, $bookingId): JsonResponse
    {
        $booking = TourGuideBooking::where('id', $bookingId)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if (!in_array($booking->status, ['pending', 'confirmed'])) {
            return response()->json(['message' => 'Cannot cancel this booking'], 400);
        }

        $booking->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Booking cancelled successfully',
            'booking' => $booking,
        ]);
    }
}
