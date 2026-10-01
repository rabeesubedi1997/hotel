<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\PackageBooking;
use App\Models\Payment;
use App\Services\LoyaltyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function __construct(private LoyaltyService $loyalty)
    {
    }

    public function methods(): JsonResponse
    {
        return response()->json([
            'methods' => [
                ['id' => 'cod', 'name' => 'Cash on Delivery (Pay at Hotel/Activity)', 'icon' => 'banknote', 'currency' => 'NPR'],
                ['id' => 'khalti', 'name' => 'Khalti Digital Wallet', 'icon' => 'wallet', 'currency' => 'NPR'],
                ['id' => 'stripe', 'name' => 'Credit/Debit Card', 'icon' => 'credit-card', 'currency' => 'USD'],
                ['id' => 'paypal', 'name' => 'PayPal', 'icon' => 'paypal', 'currency' => 'USD'],
            ],
        ]);
    }

    /**
     * Resolve the payable target from either `booking_id` or
     * `package_booking_id` — exactly one must be provided and owned by the
     * requesting user. Returns [payable, isPackage, error] where error is a
     * JsonResponse to return immediately, or null if resolution succeeded.
     */
    private function resolvePayable(Request $request): array
    {
        $request->validate([
            'booking_id' => 'required_without:package_booking_id|nullable|exists:bookings,id',
            'package_booking_id' => 'required_without:booking_id|nullable|exists:package_bookings,id',
        ]);

        if ($request->filled('package_booking_id')) {
            $packageBooking = PackageBooking::findOrFail($request->package_booking_id);
            if ((int) $packageBooking->user_id !== (int) Auth::id()) {
                Log::warning('Payment resolvePayable: package booking owner mismatch', [
                    'package_booking_id' => $packageBooking->id,
                    'package_booking_owner_id' => $packageBooking->user_id,
                    'package_booking_created_at' => $packageBooking->created_at,
                    'authenticated_user_id' => Auth::id(),
                    'authenticated_user_email' => Auth::user()?->email,
                ]);
                return [null, true, response()->json(['message' => 'Unauthorized.'], 403)];
            }
            return [$packageBooking, true, null];
        }

        $booking = Booking::findOrFail($request->booking_id);
        if ((int) $booking->user_id !== (int) Auth::id()) {
            // Temporary diagnostic logging — this exact 403 has reproduced
            // twice in what was reported as a single continuous checkout
            // session, after the multi-tab token-pinning fix. Logging the
            // actual owner vs. the actual authenticated user (plus timing)
            // here so the next occurrence can be diagnosed from fact rather
            // than guesswork.
            Log::warning('Payment resolvePayable: booking owner mismatch', [
                'booking_id' => $booking->id,
                'booking_owner_id' => $booking->user_id,
                'booking_created_at' => $booking->created_at,
                'authenticated_user_id' => Auth::id(),
                'authenticated_user_email' => Auth::user()?->email,
            ]);
            return [null, false, response()->json(['message' => 'Unauthorized.'], 403)];
        }
        return [$booking, false, null];
    }

    private function confirmPayable($payable, bool $isPackage): void
    {
        $payable->update([
            'status' => $isPackage ? PackageBooking::STATUS_CONFIRMED : Booking::STATUS_CONFIRMED,
            'confirmed_at' => now(),
        ]);

        if ($isPackage) {
            $payable->bookings()->update(['status' => Booking::STATUS_CONFIRMED, 'confirmed_at' => now()]);
        }

        $this->loyalty->earnForBooking(
            $payable->user,
            (float) $payable->total_amount,
            $isPackage ? null : $payable->id,
            $isPackage ? $payable->id : null
        );
    }

    public function initiateKhalti(Request $request): JsonResponse
    {
        $request->validate(['return_url' => 'required|url']);
        [$payable, $isPackage, $error] = $this->resolvePayable($request);
        if ($error) return $error;

        $payment = Payment::create([
            'booking_id' => $isPackage ? null : $payable->id,
            'package_booking_id' => $isPackage ? $payable->id : null,
            'method' => Payment::METHOD_KHALTI,
            'amount' => $payable->total_amount,
            'currency' => 'NPR',
            'status' => Payment::STATUS_PENDING,
            'request_data' => $request->all(),
        ]);

        // Khalti integration would go here
        // For now, return mock response
        return response()->json([
            'payment' => $payment,
            'khalti_config' => [
                'public_key' => config('services.khalti.public_key'),
                'amount' => $payable->total_amount * 100, // Paisa
                'product_identity' => $payable->booking_number,
                'product_name' => 'Booking ' . $payable->booking_number,
                'return_url' => $request->return_url,
            ],
        ]);
    }

    public function verifyKhalti(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
            'amount' => 'required|numeric',
        ]);

        // Khalti verification logic would go here
        // This is a mock implementation

        return response()->json([
            'verified' => true,
            'message' => 'Payment verified successfully.',
        ]);
    }

    public function createStripeIntent(Request $request): JsonResponse
    {
        [$payable, $isPackage, $error] = $this->resolvePayable($request);
        if ($error) return $error;

        $payment = Payment::create([
            'booking_id' => $isPackage ? null : $payable->id,
            'package_booking_id' => $isPackage ? $payable->id : null,
            'method' => Payment::METHOD_STRIPE,
            'amount' => $payable->total_amount,
            'currency' => 'USD',
            'status' => Payment::STATUS_PENDING,
            'request_data' => $request->all(),
        ]);

        // Stripe PaymentIntent creation would go here
        // For now, return mock client secret
        return response()->json([
            'payment' => $payment,
            'client_secret' => 'mock_client_secret_' . uniqid(),
        ]);
    }

    public function paypalCreateOrder(Request $request): JsonResponse
    {
        [$payable, $isPackage, $error] = $this->resolvePayable($request);
        if ($error) return $error;

        $payment = Payment::create([
            'booking_id' => $isPackage ? null : $payable->id,
            'package_booking_id' => $isPackage ? $payable->id : null,
            'method' => Payment::METHOD_PAYPAL,
            'amount' => $payable->total_amount,
            'currency' => 'USD',
            'status' => Payment::STATUS_PENDING,
            'request_data' => $request->all(),
        ]);

        // PayPal order creation would go here
        return response()->json([
            'payment' => $payment,
            'paypal_order_id' => 'ORDER_' . uniqid(),
        ]);
    }

    public function confirmPayment(Request $request, Payment $payment): JsonResponse
    {
        $isPackage = (bool) $payment->package_booking_id;
        $payable = $isPackage ? $payment->packageBooking : $payment->booking;

        if ((int) $payable->user_id !== (int) Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $payment->update([
            'status' => Payment::STATUS_COMPLETED,
            'paid_at' => now(),
        ]);

        $this->confirmPayable($payable, $isPackage);

        return response()->json([
            'payment' => $payment,
            'message' => 'Payment confirmed successfully.',
        ]);
    }

    public function createCODPayment(Request $request): JsonResponse
    {
        [$payable, $isPackage, $error] = $this->resolvePayable($request);
        if ($error) return $error;

        // Create COD payment record - auto-confirmed
        $payment = Payment::create([
            'booking_id' => $isPackage ? null : $payable->id,
            'package_booking_id' => $isPackage ? $payable->id : null,
            'method' => Payment::METHOD_CASH,
            'amount' => $payable->total_amount,
            'currency' => 'NPR',
            'status' => Payment::STATUS_COMPLETED,
            'paid_at' => now(),
            'request_data' => $request->all(),
        ]);

        $this->confirmPayable($payable, $isPackage);

        return response()->json([
            'payment' => $payment,
            'booking' => $payable,
            'message' => 'Booking confirmed with Cash on Delivery. Please pay at the venue.',
        ]);
    }
}
