<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Booking;
use App\Models\PackageBooking;
use App\Models\Payment;
use App\Notifications\PackageBookingStatusChanged;
use App\Services\LoyaltyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PackageBookingController extends Controller
{
    public function __construct(private LoyaltyService $loyalty)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = PackageBooking::with(['user', 'itinerary', 'payment']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search) {
                $q->where('booking_number', 'like', "%{$search}%")
                  ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$search}%"))
                  ->orWhereHas('itinerary', fn ($i) => $i->where('title', 'like', "%{$search}%"));
            });
        }

        $bookings = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15));

        return response()->json($bookings);
    }

    public function show(PackageBooking $packageBooking): JsonResponse
    {
        $packageBooking->load(['user', 'itinerary', 'payment', 'bookings.bookable']);

        return response()->json($packageBooking);
    }

    public function updateStatus(Request $request, PackageBooking $packageBooking): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:pending,confirmed,checked_in,checked_out,cancelled,refunded',
        ]);

        $updateData = ['status' => $request->status];
        if ($request->status === 'confirmed') {
            $updateData['confirmed_at'] = now();
        }
        if ($request->status === 'cancelled') {
            $updateData['cancelled_at'] = now();
        }

        $before = ['status' => $packageBooking->status];
        $wasConfirmedOrLater = in_array($before['status'], ['confirmed', 'checked_in', 'checked_out']);
        $packageBooking->update($updateData);

        AdminAuditLog::record($request->user(), 'status_change', 'PackageBooking', $packageBooking->id, $packageBooking->user_id, $before, ['status' => $packageBooking->status]);

        if ($wasConfirmedOrLater && in_array($request->status, ['cancelled', 'refunded']) && $packageBooking->user) {
            $this->loyalty->reverseForBooking($packageBooking->user, null, $packageBooking->id);
        }

        $packageBooking->user?->notify(new PackageBookingStatusChanged($packageBooking->fresh('itinerary')));

        return response()->json([
            'package_booking' => $packageBooking,
            'message' => 'Package booking status updated successfully.',
        ]);
    }

    public function processRefund(Request $request, PackageBooking $packageBooking): JsonResponse
    {
        if (!$packageBooking->payment || !$packageBooking->payment->isCompleted()) {
            return response()->json(['message' => 'No completed payment found for this package booking.'], 422);
        }

        $request->validate([
            'refund_amount' => 'required|numeric|min:0|max:' . $packageBooking->total_amount,
            'refund_reason' => 'required|string',
        ]);

        $packageBooking->payment->update([
            'status' => $request->refund_amount == $packageBooking->total_amount
                ? Payment::STATUS_REFUNDED
                : Payment::STATUS_PARTIALLY_REFUNDED,
            'refunded_at' => now(),
        ]);

        $wasConfirmedOrLater = in_array($packageBooking->status, ['confirmed', 'checked_in', 'checked_out']);
        $packageBooking->update([
            'status' => PackageBooking::STATUS_REFUNDED,
            'cancellation_reason' => $request->refund_reason,
        ]);

        $packageBooking->bookings()->whereNotIn('status', [Booking::STATUS_CHECKED_IN, Booking::STATUS_CHECKED_OUT])->update([
            'status' => Booking::STATUS_REFUNDED,
        ]);

        if ($wasConfirmedOrLater && $packageBooking->user) {
            $this->loyalty->reverseForBooking($packageBooking->user, null, $packageBooking->id);
        }

        return response()->json([
            'package_booking' => $packageBooking->load('payment'),
            'message' => 'Refund processed successfully.',
        ]);
    }
}
