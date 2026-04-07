<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Booking;
use App\Models\Hotel;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $bookings = $request->user()
            ->bookings()
            ->with(['bookable', 'payment', 'room'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 10));

        return response()->json($bookings);
    }

    public function show(Booking $booking): JsonResponse
    {
        if ($booking->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $booking->load(['bookable', 'payment', 'room', 'user']);

        return response()->json($booking);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'bookable_type' => 'required|string|in:hotel,activity',
            'bookable_id' => 'required|integer',
            'check_in_date' => 'required_if:bookable_type,hotel|date_format:Y-m-d|after_or_equal:today',
            'check_out_date' => 'required_if:bookable_type,hotel|date_format:Y-m-d|after:check_in_date',
            'activity_datetime' => 'required_if:bookable_type,activity|date|after_or_equal:today',
            'guests' => 'required_if:bookable_type,hotel|integer|min:1',
            'participants' => 'required_if:bookable_type,activity|integer|min:1',
            'room_id' => 'nullable|integer|exists:rooms,id',
            'special_requests' => 'nullable|string',
        ]);

        $bookableClass = $request->bookable_type === 'hotel' ? Hotel::class : Activity::class;
        $bookable = $bookableClass::find($request->bookable_id);

        if (!$bookable) {
            return response()->json(['message' => 'Item not found.'], 404);
        }

        // Calculate total amount
        if ($request->bookable_type === 'hotel') {
            $room = $request->room_id ? Room::find($request->room_id) : null;
            $pricePerNight = $room ? $room->price : $bookable->price_per_night;
            $nights = (new \DateTime($request->check_in_date))->diff(new \DateTime($request->check_out_date))->days;
            $totalAmount = $pricePerNight * $nights * $request->guests;
        } else {
            $totalAmount = $bookable->price * $request->participants;
        }

        $booking = Booking::create([
            'user_id' => $request->user()->id,
            'bookable_type' => $bookableClass,
            'bookable_id' => $request->bookable_id,
            'check_in_date' => $request->check_in_date,
            'check_out_date' => $request->check_out_date,
            'activity_datetime' => $request->activity_datetime,
            'guests' => $request->guests ?? 1,
            'participants' => $request->participants ?? 1,
            'room_id' => $request->room_id,
            'status' => Booking::STATUS_PENDING,
            'total_amount' => $totalAmount,
            'special_requests' => $request->special_requests,
        ]);

        return response()->json([
            'booking' => $booking->load('bookable'),
            'message' => 'Booking created successfully.',
        ], 201);
    }

    public function cancel(Request $request, Booking $booking): JsonResponse
    {
        if ($booking->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if (!$booking->isPending()) {
            return response()->json([
                'message' => 'Only pending bookings can be cancelled.',
            ], 422);
        }

        $request->validate([
            'cancellation_reason' => 'required|string',
        ]);

        $booking->update([
            'status' => Booking::STATUS_CANCELLED,
            'cancellation_reason' => $request->cancellation_reason,
            'cancelled_at' => now(),
        ]);

        return response()->json([
            'booking' => $booking,
            'message' => 'Booking cancelled successfully.',
        ]);
    }

    public function checkAvailability(Request $request): JsonResponse
    {
        $request->validate([
            'bookable_type' => 'required|string|in:hotel,activity',
            'bookable_id' => 'required|integer',
            'check_in_date' => 'required_if:bookable_type,hotel|date',
            'check_out_date' => 'required_if:bookable_type,hotel|date',
            'activity_datetime' => 'required_if:bookable_type,activity|date',
            'guests' => 'required_if:bookable_type,hotel|integer|min:1',
            'participants' => 'required_if:bookable_type,activity|integer|min:1',
        ]);

        $bookableClass = $request->bookable_type === 'hotel' ? Hotel::class : Activity::class;
        $bookable = $bookableClass::find($request->bookable_id);

        if (!$bookable) {
            return response()->json(['message' => 'Item not found.'], 404);
        }

        // For hotels, check room availability
        if ($request->bookable_type === 'hotel') {
            $conflictingBookings = Booking::where('bookable_type', $bookableClass)
                ->where('bookable_id', $request->bookable_id)
                ->whereNotIn('status', [Booking::STATUS_CANCELLED, Booking::STATUS_REFUNDED])
                ->where(function ($q) use ($request) {
                    $q->whereBetween('check_in_date', [$request->check_in_date, $request->check_out_date])
                      ->orWhereBetween('check_out_date', [$request->check_in_date, $request->check_out_date])
                      ->orWhere(function ($q) use ($request) {
                          $q->where('check_in_date', '<=', $request->check_in_date)
                            ->where('check_out_date', '>=', $request->check_out_date);
                      });
                })
                ->count();

            $isAvailable = $conflictingBookings < $bookable->rooms()->sum('available_count');
        } else {
            // For activities, check max participants
            $bookedParticipants = Booking::where('bookable_type', $bookableClass)
                ->where('bookable_id', $request->bookable_id)
                ->where('activity_datetime', $request->activity_datetime)
                ->whereNotIn('status', [Booking::STATUS_CANCELLED, Booking::STATUS_REFUNDED])
                ->sum('participants');

            $isAvailable = ($bookedParticipants + $request->participants) <= $bookable->max_participants;
        }

        return response()->json([
            'available' => $isAvailable,
            'message' => $isAvailable ? 'Available for booking.' : 'Not available for the selected dates/times.',
        ]);
    }

    public function getCalendarData(Request $request): JsonResponse
    {
        $request->validate([
            'hotel_id' => 'required|integer|exists:hotels,id',
            'room_id' => 'nullable|integer|exists:rooms,id',
            'year' => 'required|integer|min:2020|max:2030',
            'month' => 'required|integer|min:1|max:12',
        ]);

        $hotelId = $request->hotel_id;
        $roomId = $request->room_id;
        $year = $request->year;
        $month = $request->month;

        // Get all bookings for the hotel (and specific room if provided)
        $query = Booking::where('bookable_type', Hotel::class)
            ->where('bookable_id', $hotelId)
            ->whereNotIn('status', [Booking::STATUS_CANCELLED, Booking::STATUS_REFUNDED])
            ->whereYear('check_in_date', $year)
            ->whereMonth('check_in_date', $month);

        if ($roomId) {
            $query->where('room_id', $roomId);
        }

        $bookings = $query->with('room')->get();

        // Format bookings for calendar
        $calendarData = $bookings->map(function ($booking) {
            return [
                'id' => $booking->id,
                'check_in_date' => $booking->check_in_date,
                'check_out_date' => $booking->check_out_date,
                'status' => $booking->status,
                'room_type' => $booking->room ? $booking->room->room_type : null,
                'guests' => $booking->guests,
            ];
        });

        return response()->json($calendarData);
    }
}
