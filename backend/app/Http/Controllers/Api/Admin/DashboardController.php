<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Hotel;
use App\Models\Activity;
use App\Models\Review;
use App\Models\TourGuideBooking;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $stats = [
            'total_bookings' => Booking::count(),
            'pending_bookings' => Booking::where('status', Booking::STATUS_PENDING)->count(),
            'confirmed_bookings' => Booking::where('status', Booking::STATUS_CONFIRMED)->count(),
            'total_revenue' => Booking::whereIn('status', [Booking::STATUS_CONFIRMED, Booking::STATUS_CHECKED_OUT])->sum('total_amount'),
            'total_hotels' => Hotel::count(),
            'active_hotels' => Hotel::where('status', Hotel::STATUS_ACTIVE)->count(),
            'total_activities' => Activity::count(),
            'active_activities' => Activity::where('status', Activity::STATUS_ACTIVE)->count(),
            'total_users' => User::where('role', User::ROLE_CUSTOMER)->count(),
            'total_reviews' => Review::count(),
            'pending_reviews' => Review::where('status', Review::STATUS_PENDING)->count(),
        ];

        return response()->json($stats);
    }

    public function recentBookings(): JsonResponse
    {
        $bookings = Booking::with(['user', 'bookable'])
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get();

        return response()->json($bookings);
    }

    /**
     * Pending booking/hire requests still awaiting a reply, oldest first, so
     * the dashboard can surface exactly what an "instant booking" promise
     * needs staff to act on right now — with each one's SLA deadline for a
     * live countdown on the frontend.
     */
    public function pendingRequests(): JsonResponse
    {
        $bookings = Booking::where('status', Booking::STATUS_PENDING)
            ->with(['user', 'bookable'])
            ->orderBy('created_at')
            ->take(10)
            ->get()
            ->map(fn (Booking $booking) => [
                'id' => $booking->id,
                'kind' => 'booking',
                'reference' => $booking->booking_number,
                'item_name' => $booking->bookable?->name,
                'guest_name' => $booking->user?->name,
                'created_at' => $booking->created_at,
                'response_due_at' => $booking->response_due_at,
                'action_url' => "/admin/bookings/{$booking->id}",
            ]);

        $hires = TourGuideBooking::where('status', 'pending')
            ->with(['user', 'tourGuide'])
            ->orderBy('created_at')
            ->take(10)
            ->get()
            ->map(fn (TourGuideBooking $booking) => [
                'id' => $booking->id,
                'kind' => 'tour_guide',
                'reference' => 'TG-' . $booking->id,
                'item_name' => $booking->tourGuide?->name,
                'guest_name' => $booking->user?->name,
                'created_at' => $booking->created_at,
                'response_due_at' => $booking->response_due_at,
                'action_url' => '/admin/tour-guides?tab=bookings',
            ]);

        $requests = $bookings->concat($hires)->sortBy('created_at')->values();

        return response()->json($requests);
    }

    public function popularItems(): JsonResponse
    {
        $popularHotels = Hotel::withCount(['bookings'])
            ->orderBy('bookings_count', 'desc')
            ->take(5)
            ->get();

        $popularActivities = Activity::withCount(['bookings'])
            ->orderBy('bookings_count', 'desc')
            ->take(5)
            ->get();

        return response()->json([
            'hotels' => $popularHotels,
            'activities' => $popularActivities,
        ]);
    }
}
