<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\LoyaltyAccount;
use App\Models\LoyaltyTransaction;
use App\Models\PackageBooking;
use App\Services\LoyaltyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoyaltyController extends Controller
{
    public function __construct(private LoyaltyService $loyalty)
    {
    }

    public function account(Request $request): JsonResponse
    {
        $account = LoyaltyAccount::firstOrCreate(['user_id' => $request->user()->id]);
        $transactions = LoyaltyTransaction::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json([
            'account' => $account,
            'points_per_dollar' => $this->loyalty->pointsPerDollarPublic(),
            'recent_transactions' => $transactions,
        ]);
    }

    public function redeem(Request $request): JsonResponse
    {
        $request->validate([
            'points' => 'required|integer|min:1',
            'booking_id' => 'required_without:package_booking_id|nullable|integer|exists:bookings,id',
            'package_booking_id' => 'required_without:booking_id|nullable|integer|exists:package_bookings,id',
        ]);

        if ($request->filled('booking_id')) {
            $booking = Booking::findOrFail($request->booking_id);
            if ($booking->user_id !== $request->user()->id || !$booking->isPending()) {
                return response()->json(['message' => 'This booking is not eligible for a points redemption.'], 422);
            }
        } else {
            $packageBooking = PackageBooking::findOrFail($request->package_booking_id);
            if ($packageBooking->user_id !== $request->user()->id || !$packageBooking->isPending()) {
                return response()->json(['message' => 'This package booking is not eligible for a points redemption.'], 422);
            }
        }

        $result = $this->loyalty->redeem(
            $request->user(),
            $request->points,
            $request->booking_id,
            $request->package_booking_id
        );

        if (!$result['success']) {
            return response()->json(['message' => $result['message']], 422);
        }

        // Apply the redemption discount to whichever order it was for —
        // additive to any coupon discount already applied, capped so the
        // combined discount never exceeds the order total.
        if ($request->filled('booking_id')) {
            $booking = Booking::find($request->booking_id);
            $newDiscount = min((float) $booking->discount_amount + $result['discount_amount'], (float) $booking->total_amount + (float) $booking->discount_amount);
            $newTotal = ((float) $booking->total_amount + (float) $booking->discount_amount) - $newDiscount;
            $booking->update(['discount_amount' => $newDiscount, 'total_amount' => $newTotal]);
            $updated = $booking->fresh();
        } else {
            $packageBooking = PackageBooking::find($request->package_booking_id);
            $newDiscount = min((float) $packageBooking->discount_amount + $result['discount_amount'], (float) $packageBooking->package_price);
            $newTotal = (float) $packageBooking->package_price - $newDiscount;
            $packageBooking->update(['discount_amount' => $newDiscount, 'total_amount' => $newTotal]);
            $updated = $packageBooking->fresh();
        }

        return response()->json([
            'discount_amount' => $result['discount_amount'],
            'booking' => $updated,
            'message' => 'Points redeemed successfully.',
        ]);
    }
}
