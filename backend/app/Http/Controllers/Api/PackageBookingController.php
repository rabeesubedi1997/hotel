<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Booking;
use App\Models\Hotel;
use App\Models\Itinerary;
use App\Models\PackageBooking;
use App\Services\CouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PackageBookingController extends Controller
{
    public function __construct(private CouponService $coupons)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $bookings = $request->user()
            ->packageBookings()
            ->with(['itinerary', 'payment', 'bookings.bookable'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 10));

        return response()->json($bookings);
    }

    public function show(PackageBooking $packageBooking): JsonResponse
    {
        if ($packageBooking->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $packageBooking->load(['itinerary.items', 'payment', 'bookings.bookable', 'bookings.room']);

        return response()->json($packageBooking);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'itinerary_id' => 'required|integer|exists:itineraries,id',
            'travel_date' => 'required|date_format:Y-m-d|after_or_equal:today',
            'travelers' => 'required|integer|min:1',
            'special_requests' => 'nullable|string',
            'coupon_code' => 'nullable|string',
        ]);

        $itinerary = Itinerary::with('items')->find($request->itinerary_id);

        if (!$itinerary || $itinerary->type !== Itinerary::TYPE_CURATED || $itinerary->status !== Itinerary::STATUS_PUBLISHED) {
            return response()->json(['message' => 'This package is not available for booking.'], 422);
        }

        if ($itinerary->max_travelers && $request->travelers > $itinerary->max_travelers) {
            return response()->json(['message' => "This package allows a maximum of {$itinerary->max_travelers} travelers."], 422);
        }

        // Only hotel/activity items hold real inventory; tour guides are
        // hired separately (same carve-out MultiItemCheckout uses today).
        $bookableItems = $itinerary->items->filter(
            fn ($item) => in_array($item->bookable_type, [Hotel::class, Activity::class])
        );

        if ($bookableItems->isEmpty()) {
            return response()->json(['message' => 'This package has no bookable items.'], 422);
        }

        // All-or-nothing: check every item's availability up front so a
        // fixed-price purchase never partially fails like the old
        // itinerary-mode checkout did.
        $unavailable = [];
        $itemDates = [];
        foreach ($bookableItems as $item) {
            $concreteDate = date('Y-m-d', strtotime($request->travel_date . " +" . max(0, $item->day_number - 1) . " days"));
            $itemDates[$item->id] = $concreteDate;

            if ($item->bookable_type === Hotel::class) {
                $hotel = $item->bookable;
                if (!$hotel) { $unavailable[] = "Day {$item->day_number}: hotel no longer available"; continue; }
                $checkOut = date('Y-m-d', strtotime($concreteDate . ' +1 day'));
                $conflicting = Booking::where('bookable_type', Hotel::class)
                    ->where('bookable_id', $hotel->id)
                    ->whereNotIn('status', [Booking::STATUS_CANCELLED, Booking::STATUS_REFUNDED])
                    ->where(function ($q) use ($concreteDate, $checkOut) {
                        $q->whereBetween('check_in_date', [$concreteDate, $checkOut])
                          ->orWhereBetween('check_out_date', [$concreteDate, $checkOut])
                          ->orWhere(function ($q2) use ($concreteDate, $checkOut) {
                              $q2->where('check_in_date', '<=', $concreteDate)->where('check_out_date', '>=', $checkOut);
                          });
                    })
                    ->count();
                $capacity = $hotel->rooms()->sum('available_count');
                if ($conflicting + $request->travelers > max($capacity, 1)) {
                    $unavailable[] = "Day {$item->day_number}: {$hotel->name} is not available for these dates";
                }
            } elseif ($item->bookable_type === Activity::class) {
                $activity = $item->bookable;
                if (!$activity) { $unavailable[] = "Day {$item->day_number}: activity no longer available"; continue; }
                $booked = Booking::where('bookable_type', Activity::class)
                    ->where('bookable_id', $activity->id)
                    ->whereDate('activity_datetime', $concreteDate)
                    ->whereNotIn('status', [Booking::STATUS_CANCELLED, Booking::STATUS_REFUNDED])
                    ->sum('participants');
                if ($booked + $request->travelers > $activity->max_participants) {
                    $unavailable[] = "Day {$item->day_number}: {$activity->name} is full on this date";
                }
            }
        }

        if (!empty($unavailable)) {
            return response()->json([
                'message' => 'Some items in this package are not available for the selected date.',
                'errors' => $unavailable,
            ], 422);
        }

        // Package price: admin-set fixed_price, or fall back to the sum of
        // each item's per-traveler price (same math BookingController uses)
        // so a package always has a real, computed price even before an
        // admin has explicitly discounted it into a bundle.
        $packagePrice = $itinerary->fixed_price ?? $bookableItems->sum(function ($item) use ($request) {
            $bookable = $item->bookable;
            if (!$bookable) return 0;
            return $item->bookable_type === Hotel::class
                ? $bookable->price_per_night * $request->travelers
                : $bookable->price * $request->travelers;
        });

        $discountAmount = 0;
        $appliedCoupon = null;
        if ($request->filled('coupon_code')) {
            $result = $this->coupons->evaluate($request->coupon_code, $request->user(), $packagePrice, 'packages');
            if ($result['valid']) {
                $discountAmount = $result['discount_amount'];
                $appliedCoupon = $result['coupon'];
            }
        }

        $packageBooking = DB::transaction(function () use ($request, $itinerary, $bookableItems, $itemDates, $packagePrice, $discountAmount) {
            $package = PackageBooking::create([
                'user_id' => $request->user()->id,
                'itinerary_id' => $itinerary->id,
                'travel_date' => $request->travel_date,
                'travelers' => $request->travelers,
                'package_price' => $packagePrice,
                'discount_amount' => $discountAmount,
                'total_amount' => $packagePrice - $discountAmount,
                'status' => PackageBooking::STATUS_PENDING,
                'special_requests' => $request->special_requests,
            ]);

            foreach ($bookableItems as $item) {
                $bookable = $item->bookable;
                $concreteDate = $itemDates[$item->id];

                if ($item->bookable_type === Hotel::class) {
                    Booking::create([
                        'user_id' => $request->user()->id,
                        'itinerary_id' => $itinerary->id,
                        'package_booking_id' => $package->id,
                        'bookable_type' => Hotel::class,
                        'bookable_id' => $bookable->id,
                        'check_in_date' => $concreteDate,
                        'check_out_date' => date('Y-m-d', strtotime($concreteDate . ' +1 day')),
                        'guests' => $request->travelers,
                        'status' => Booking::STATUS_PENDING,
                        'total_amount' => $bookable->price_per_night * $request->travelers,
                    ]);
                } else {
                    Booking::create([
                        'user_id' => $request->user()->id,
                        'itinerary_id' => $itinerary->id,
                        'package_booking_id' => $package->id,
                        'bookable_type' => Activity::class,
                        'bookable_id' => $bookable->id,
                        'activity_datetime' => $concreteDate . ' 09:00:00',
                        'participants' => $request->travelers,
                        'status' => Booking::STATUS_PENDING,
                        'total_amount' => $bookable->price * $request->travelers,
                    ]);
                }
            }

            return $package;
        });

        if ($appliedCoupon) {
            $this->coupons->recordRedemption($appliedCoupon, $request->user(), $discountAmount, null);
        }

        return response()->json([
            'package_booking' => $packageBooking->load('bookings.bookable'),
            'message' => 'Package booked successfully.',
        ], 201);
    }

    public function cancel(Request $request, PackageBooking $packageBooking): JsonResponse
    {
        if ($packageBooking->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if (!$packageBooking->isPending()) {
            return response()->json(['message' => 'Only pending packages can be cancelled.'], 422);
        }

        $request->validate(['cancellation_reason' => 'required|string']);

        DB::transaction(function () use ($packageBooking, $request) {
            $packageBooking->update([
                'status' => PackageBooking::STATUS_CANCELLED,
                'cancellation_reason' => $request->cancellation_reason,
                'cancelled_at' => now(),
            ]);

            $packageBooking->bookings()->whereNotIn('status', [Booking::STATUS_CHECKED_IN, Booking::STATUS_CHECKED_OUT])->update([
                'status' => Booking::STATUS_CANCELLED,
                'cancellation_reason' => 'Package cancelled: ' . $request->cancellation_reason,
                'cancelled_at' => now(),
            ]);
        });

        return response()->json([
            'package_booking' => $packageBooking,
            'message' => 'Package cancelled successfully.',
        ]);
    }

    public function downloadInvoice(PackageBooking $packageBooking, \App\Services\InvoiceService $invoices)
    {
        if ($packageBooking->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return $invoices->generateForPackageBooking($packageBooking);
    }
}
