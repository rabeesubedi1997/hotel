<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Concerns\ActsForVendor;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Hotel;
use App\Models\Activity;
use App\Models\TourGuide;
use App\Models\TourGuideBooking;
use App\Notifications\BookingStatusChanged;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    use ActsForVendor;

    public function index(Request $request)
    {
        $vendorId = $this->vendorId($request);
        
        // Get vendor's hotel and activity IDs
        $hotelIds = Hotel::where('user_id', $vendorId)->pluck('id');
        $activityIds = Activity::where('user_id', $vendorId)->pluck('id');
        
        // Get bookings for vendor's properties
        $bookings = Booking::where(function($query) use ($hotelIds, $activityIds) {
            $query->where(function($subQuery) use ($hotelIds) {
                $subQuery->whereIn('bookable_id', $hotelIds)
                      ->where('bookable_type', Hotel::class);
            })->orWhere(function($subQuery) use ($activityIds) {
                $subQuery->whereIn('bookable_id', $activityIds)
                      ->where('bookable_type', Activity::class);
            });
        })
        ->with(['bookable', 'user'])
        ->orderBy('created_at', 'desc')
        ->get();
        
        return response()->json($bookings);
    }

    public function show(Request $request, $id)
    {
        $vendorId = $this->vendorId($request);
        
        // Get vendor's hotel and activity IDs
        $hotelIds = Hotel::where('user_id', $vendorId)->pluck('id');
        $activityIds = Activity::where('user_id', $vendorId)->pluck('id');
        
        $booking = Booking::where(function($query) use ($hotelIds, $activityIds) {
            $query->where(function($subQuery) use ($hotelIds) {
                $subQuery->whereIn('bookable_id', $hotelIds)
                      ->where('bookable_type', Hotel::class);
            })->orWhere(function($subQuery) use ($activityIds) {
                $subQuery->whereIn('bookable_id', $activityIds)
                      ->where('bookable_type', Activity::class);
            });
        })->where('id', $id)
        ->with(['bookable', 'user'])
        ->firstOrFail();
        
        return response()->json($booking);
    }

    public function updateStatus(Request $request, $id)
    {
        $vendorId = $this->vendorId($request);
        
        // Get vendor's hotel and activity IDs
        $hotelIds = Hotel::where('user_id', $vendorId)->pluck('id');
        $activityIds = Activity::where('user_id', $vendorId)->pluck('id');
        
        $booking = Booking::where(function($query) use ($hotelIds, $activityIds) {
            $query->where(function($subQuery) use ($hotelIds) {
                $subQuery->whereIn('bookable_id', $hotelIds)
                      ->where('bookable_type', Hotel::class);
            })->orWhere(function($subQuery) use ($activityIds) {
                $subQuery->whereIn('bookable_id', $activityIds)
                      ->where('bookable_type', Activity::class);
            });
        })->where('id', $id)
        ->firstOrFail();
        
        $validated = $request->validate([
            'status' => 'required|in:pending,confirmed,checked_in,checked_out,cancelled,refunded'
        ]);
        
        $booking->update([
            'status' => $validated['status'],
            'notes' => $request->input('notes', $booking->notes)
        ]);

        $booking->user?->notify(new BookingStatusChanged($booking->fresh('bookable')));

        return response()->json([
            'message' => 'Booking status updated successfully',
            'booking' => $booking->fresh()
        ]);
    }

    public function stats(Request $request)
    {
        $vendorId = $this->vendorId($request);

        // Get vendor's hotel, activity, and tour-guide IDs
        $hotelIds = Hotel::where('user_id', $vendorId)->pluck('id');
        $activityIds = Activity::where('user_id', $vendorId)->pluck('id');
        $tourGuideIds = TourGuide::where('vendor_id', $vendorId)->pluck('id');

        // Booking statistics — built as a closure so each metric below gets
        // a fresh Builder instead of mutating and compounding where-clauses
        // onto a shared instance (Eloquent's ->where() mutates $this rather
        // than cloning it).
        $vendorBookings = function () use ($hotelIds, $activityIds) {
            return Booking::where(function ($query) use ($hotelIds, $activityIds) {
                $query->where(function ($subQuery) use ($hotelIds) {
                    $subQuery->whereIn('bookable_id', $hotelIds)
                          ->where('bookable_type', Hotel::class);
                })->orWhere(function ($subQuery) use ($activityIds) {
                    $subQuery->whereIn('bookable_id', $activityIds)
                          ->where('bookable_type', Activity::class);
                });
            });
        };

        // TourGuideBooking isn't part of the polymorphic Booking/bookable
        // system — it's a separate model with its own status set
        // (pending/confirmed/completed/cancelled, no checked_in/checked_out/
        // refunded), so it's tallied separately rather than folded into
        // $vendorBookings above.
        $vendorGuideBookings = fn () => TourGuideBooking::whereIn('tour_guide_id', $tourGuideIds);

        $stats = [
            'total_bookings' => $vendorBookings()->count() + $vendorGuideBookings()->count(),
            'pending_bookings' => $vendorBookings()->where('status', 'pending')->count() + $vendorGuideBookings()->where('status', 'pending')->count(),
            'confirmed_bookings' => $vendorBookings()->where('status', 'confirmed')->count() + $vendorGuideBookings()->where('status', 'confirmed')->count(),
            'completed_bookings' => $vendorBookings()->where('status', 'checked_out')->count() + $vendorGuideBookings()->where('status', 'completed')->count(),
            'cancelled_bookings' => $vendorBookings()->where('status', 'cancelled')->count() + $vendorGuideBookings()->where('status', 'cancelled')->count(),
            'total_revenue' => $vendorBookings()->where('status', 'confirmed')->sum('total_amount') + $vendorGuideBookings()->where('status', 'confirmed')->sum('total_price'),
        ];

        return response()->json($stats);
    }
}
