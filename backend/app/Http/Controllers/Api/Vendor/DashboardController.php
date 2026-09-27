<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Concerns\ActsForVendor;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Booking;
use App\Models\Hotel;
use App\Models\TourGuide;
use App\Models\TourGuideBooking;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ActsForVendor;

    public function stats(Request $request)
    {
        $vendorId = $this->vendorId($request);

        $hotelCount = Hotel::where('user_id', $vendorId)->count();
        $activityCount = Activity::where('user_id', $vendorId)->count();
        $tourGuideCount = TourGuide::where('vendor_id', $vendorId)->count();

        // Get vendor's hotel and activity IDs
        $hotelIds = Hotel::where('user_id', $vendorId)->pluck('id');
        $activityIds = Activity::where('user_id', $vendorId)->pluck('id');
        $tourGuideIds = TourGuide::where('vendor_id', $vendorId)->pluck('id');
        
        // Base query for bookings on vendor's properties. Built as a
        // closure so each metric below gets a fresh Builder instead of
        // mutating and compounding where-clauses onto a shared instance
        // (Eloquent's ->where() mutates $this rather than cloning it).
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

        $vendorGuideBookings = fn () => TourGuideBooking::whereIn('tour_guide_id', $tourGuideIds);

        // Get pending items
        $pendingHotels = Hotel::where('user_id', $vendorId)->pending()->count();
        $pendingActivities = Activity::where('user_id', $vendorId)->pending()->count();
        $pendingTourGuides = TourGuide::where('vendor_id', $vendorId)->pending()->count();

        $totalRevenue = $vendorBookings()->where('status', 'confirmed')->sum('total_amount');
        $bookingCount = $vendorBookings()->count();
        $guideBookingCount = $vendorGuideBookings()->count();
        $guideRevenue = $vendorGuideBookings()->where('status', 'confirmed')->sum('total_price');

        return response()->json([
            'hotels_count' => $hotelCount,
            'activities_count' => $activityCount,
            'tour_guides_count' => $tourGuideCount,
            'total_bookings' => $bookingCount + $guideBookingCount,
            'hotel_bookings' => $vendorBookings()->where('bookable_type', Hotel::class)->count(),
            'activity_bookings' => $vendorBookings()->where('bookable_type', Activity::class)->count(),
            'tour_guide_bookings' => $guideBookingCount,
            'total_revenue' => $totalRevenue + $guideRevenue,
            'hotel_revenue' => $vendorBookings()->where('bookable_type', Hotel::class)->where('status', 'confirmed')->sum('total_amount'),
            'activity_revenue' => $vendorBookings()->where('bookable_type', Activity::class)->where('status', 'confirmed')->sum('total_amount'),
            'tour_guide_revenue' => $guideRevenue,
            'pending_hotels' => $pendingHotels,
            'pending_activities' => $pendingActivities,
            'pending_tour_guides' => $pendingTourGuides,
            'total_pending' => $pendingHotels + $pendingActivities + $pendingTourGuides,
        ]);
    }
}
