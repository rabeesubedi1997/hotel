<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Booking;
use App\Models\Hotel;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $vendorId = $request->user()->id;

        $hotelCount = Hotel::where('user_id', $vendorId)->count();
        $activityCount = Activity::where('user_id', $vendorId)->count();
        
        // Get vendor's hotel and activity IDs
        $hotelIds = Hotel::where('user_id', $vendorId)->pluck('id');
        $activityIds = Activity::where('user_id', $vendorId)->pluck('id');
        
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

        // Get pending items
        $pendingHotels = Hotel::where('user_id', $vendorId)->pending()->count();
        $pendingActivities = Activity::where('user_id', $vendorId)->pending()->count();

        $totalRevenue = $vendorBookings()->where('status', 'confirmed')->sum('total_amount');
        $bookingCount = $vendorBookings()->count();

        return response()->json([
            'hotels_count' => $hotelCount,
            'activities_count' => $activityCount,
            'total_bookings' => $bookingCount,
            'hotel_bookings' => $vendorBookings()->where('bookable_type', Hotel::class)->count(),
            'activity_bookings' => $vendorBookings()->where('bookable_type', Activity::class)->count(),
            'total_revenue' => $totalRevenue,
            'hotel_revenue' => $vendorBookings()->where('bookable_type', Hotel::class)->where('status', 'confirmed')->sum('total_amount'),
            'activity_revenue' => $vendorBookings()->where('bookable_type', Activity::class)->where('status', 'confirmed')->sum('total_amount'),
            'pending_hotels' => $pendingHotels,
            'pending_activities' => $pendingActivities,
            'total_pending' => $pendingHotels + $pendingActivities,
        ]);
    }
}
