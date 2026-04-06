<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Booking::with(['user', 'bookable', 'payment']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where('booking_number', 'like', "%{$search}%");
        }

        $bookings = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($bookings);
    }

    public function show(Booking $booking): JsonResponse
    {
        $booking->load(['user', 'bookable', 'payment', 'room']);

        return response()->json($booking);
    }

    public function updateStatus(Request $request, Booking $booking): JsonResponse
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

        $booking->update($updateData);

        return response()->json([
            'booking' => $booking,
            'message' => 'Booking status updated successfully.',
        ]);
    }

    public function processRefund(Request $request, Booking $booking): JsonResponse
    {
        if (!$booking->payment || !$booking->payment->isCompleted()) {
            return response()->json([
                'message' => 'No completed payment found for this booking.',
            ], 422);
        }

        $request->validate([
            'refund_amount' => 'required|numeric|min:0|max:' . $booking->total_amount,
            'refund_reason' => 'required|string',
        ]);

        // Update payment status
        $booking->payment->update([
            'status' => $request->refund_amount == $booking->total_amount
                ? Payment::STATUS_REFUNDED
                : Payment::STATUS_PARTIALLY_REFUNDED,
            'refunded_at' => now(),
        ]);

        // Update booking status
        $booking->update([
            'status' => Booking::STATUS_REFUNDED,
            'cancellation_reason' => $request->refund_reason,
        ]);

        return response()->json([
            'booking' => $booking->load('payment'),
            'message' => 'Refund processed successfully.',
        ]);
    }

    public function confirmBooking(Booking $booking): JsonResponse
    {
        if (!$booking->isPending()) {
            return response()->json([
                'message' => 'Only pending bookings can be confirmed.',
            ], 422);
        }

        $booking->update([
            'status' => Booking::STATUS_CONFIRMED,
            'confirmed_at' => now(),
        ]);

        return response()->json([
            'booking' => $booking,
            'message' => 'Booking confirmed successfully.',
        ]);
    }

    public function getCalendarData(Request $request): JsonResponse
    {
        $request->validate([
            'hotel_id' => 'required|integer|exists:hotels,id',
            'room_id' => 'nullable|integer|exists:rooms,id',
            'year' => 'required|integer',
            'month' => 'required|integer|between:1,12',
        ]);

        $hotelId = $request->hotel_id;
        $roomId = $request->room_id;
        $year = $request->year;
        $month = $request->month;

        // Get start and end of month
        $startDate = "$year-" . str_pad($month, 2, '0', STR_PAD_LEFT) . "-01";
        $endDate = date('Y-m-t', strtotime($startDate));

        // Query bookings that overlap with this month
        $query = Booking::where('bookable_type', 'App\Models\Hotel')
            ->where('bookable_id', $hotelId)
            ->whereNotIn('status', [Booking::STATUS_CANCELLED, Booking::STATUS_REFUNDED])
            ->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('check_in_date', [$startDate, $endDate])
                  ->orWhereBetween('check_out_date', [$startDate, $endDate])
                  ->orWhere(function ($q) use ($startDate, $endDate) {
                      $q->where('check_in_date', '<=', $startDate)
                        ->where('check_out_date', '>=', $endDate);
                  });
            });

        if ($roomId) {
            $query->where('room_id', $roomId);
        }

        $bookings = $query->select('id', 'check_in_date', 'check_out_date', 'status', 'guests')
            ->orderBy('check_in_date')
            ->get();

        return response()->json($bookings);
    }
}
