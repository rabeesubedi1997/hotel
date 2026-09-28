<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Booking;
use App\Models\BookingExtra;
use App\Models\Hotel;
use App\Models\Room;
use App\Notifications\NewBookingRequest;
use App\Services\BookingAlertService;
use App\Services\CouponService;
use App\Services\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;

class BookingController extends Controller
{
    public function __construct(
        private CouponService $coupons,
        private InvoiceService $invoices,
        private BookingAlertService $alerts,
    ) {
    }


    public function index(Request $request): JsonResponse
    {
        $bookings = $request->user()
            ->bookings()
            ->with(['bookable', 'payment', 'room', 'extras.activity'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 10));

        return response()->json($bookings);
    }

    public function show(Booking $booking): JsonResponse
    {
        if ($booking->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $booking->load(['bookable', 'payment', 'room', 'user', 'extras.activity']);

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
            // Optional — set when this booking is one item of a "book this
            // whole itinerary" action, so related bookings can be grouped.
            'itinerary_id' => 'nullable|integer|exists:itineraries,id',
            'coupon_code' => 'nullable|string',
            // Optional add-on activities attached to a hotel booking (e.g. a
            // guided tour booked alongside the room) — see the "Enhance your
            // stay" step in HotelDetails/Checkout.
            'extras' => 'nullable|array',
            'extras.*.activity_id' => 'required_with:extras|integer|exists:activities,id',
            'extras.*.quantity' => 'required_with:extras|integer|min:1',
        ]);

        if ($request->itinerary_id) {
            $itinerary = \App\Models\Itinerary::find($request->itinerary_id);
            $ownsPersonalTrip = $itinerary && $itinerary->type === \App\Models\Itinerary::TYPE_PERSONAL
                && $itinerary->user_id === $request->user()->id;
            $isBookableCuratedTrip = $itinerary && $itinerary->type === \App\Models\Itinerary::TYPE_CURATED
                && $itinerary->status === \App\Models\Itinerary::STATUS_PUBLISHED;

            if (!$ownsPersonalTrip && !$isBookableCuratedTrip) {
                return response()->json(['message' => 'Invalid itinerary.'], 422);
            }
        }

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

        // Resolve extras (add-on activities) against real, current prices —
        // never trust a client-supplied subtotal — and fold them into the
        // total before coupon evaluation, same as the room price above.
        $extraLines = [];
        if ($request->bookable_type === 'hotel' && $request->filled('extras')) {
            foreach ($request->extras as $extra) {
                $activity = Activity::find($extra['activity_id']);
                if (!$activity) {
                    continue;
                }
                $quantity = (int) $extra['quantity'];
                $subtotal = $activity->price * $quantity;
                $totalAmount += $subtotal;
                $extraLines[] = [
                    'activity_id' => $activity->id,
                    'quantity' => $quantity,
                    'unit_price' => $activity->price,
                    'subtotal' => $subtotal,
                ];
            }
        }

        // Re-validate the coupon server-side — never trust a client-computed
        // discount. A code that stops being valid between "Apply" and submit
        // (limit reached, expired) silently drops rather than failing the
        // whole booking, since the total already reflects the checked amount.
        $discountAmount = 0;
        $appliedCoupon = null;
        if ($request->filled('coupon_code')) {
            $scope = $request->bookable_type === 'hotel' ? 'hotels' : 'activities';
            $result = $this->coupons->evaluate($request->coupon_code, $request->user(), $totalAmount, $scope);
            if ($result['valid']) {
                $discountAmount = $result['discount_amount'];
                $appliedCoupon = $result['coupon'];
            }
        }

        $booking = Booking::create([
            'user_id' => $request->user()->id,
            'itinerary_id' => $request->itinerary_id,
            'bookable_type' => $bookableClass,
            'bookable_id' => $request->bookable_id,
            'check_in_date' => $request->check_in_date,
            'check_out_date' => $request->check_out_date,
            'activity_datetime' => $request->activity_datetime,
            'guests' => $request->guests ?? 1,
            'participants' => $request->participants ?? 1,
            'room_id' => $request->room_id,
            'status' => Booking::STATUS_PENDING,
            'total_amount' => $totalAmount - $discountAmount,
            'discount_amount' => $discountAmount,
            'special_requests' => $request->special_requests,
            'response_due_at' => now()->addMinutes((int) config('booking.response_sla_minutes')),
        ]);

        if ($appliedCoupon) {
            $this->coupons->recordRedemption($appliedCoupon, $request->user(), $discountAmount, $booking->id);
        }

        foreach ($extraLines as $line) {
            BookingExtra::create($line + ['booking_id' => $booking->id]);
        }

        // Notify the listing owner + admins instantly so a real person can
        // respond right away, rather than the request sitting unseen.
        Notification::send(
            $this->alerts->recipientsFor($bookable->user),
            new NewBookingRequest($booking->load('bookable', 'user'))
        );

        return response()->json([
            'booking' => $booking->load('bookable', 'extras.activity'),
            'message' => 'Booking created successfully.',
        ], 201);
    }

    public function downloadInvoice(Booking $booking)
    {
        if ($booking->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return $this->invoices->generateForBooking($booking);
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
