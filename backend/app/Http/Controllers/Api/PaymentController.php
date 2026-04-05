<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

class PaymentController extends Controller
{
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

    public function initiateKhalti(Request $request): JsonResponse
    {
        $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'return_url' => 'required|url',
        ]);

        $booking = Booking::findOrFail($request->booking_id);

        if ($booking->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        // Create payment record
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'method' => Payment::METHOD_KHALTI,
            'amount' => $booking->total_amount,
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
                'amount' => $booking->total_amount * 100, // Paisa
                'product_identity' => $booking->booking_number,
                'product_name' => 'Booking ' . $booking->booking_number,
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
        $request->validate([
            'booking_id' => 'required|exists:bookings,id',
        ]);

        $booking = Booking::findOrFail($request->booking_id);

        if ($booking->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        // Create payment record
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'method' => Payment::METHOD_STRIPE,
            'amount' => $booking->total_amount,
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
        $request->validate([
            'booking_id' => 'required|exists:bookings,id',
        ]);

        $booking = Booking::findOrFail($request->booking_id);

        if ($booking->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        // Create payment record
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'method' => Payment::METHOD_PAYPAL,
            'amount' => $booking->total_amount,
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
        if ($payment->booking->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $payment->update([
            'status' => Payment::STATUS_COMPLETED,
            'paid_at' => now(),
        ]);

        // Confirm booking
        $payment->booking->update([
            'status' => Booking::STATUS_CONFIRMED,
            'confirmed_at' => now(),
        ]);

        return response()->json([
            'payment' => $payment,
            'message' => 'Payment confirmed successfully.',
        ]);
    }

    public function createCODPayment(Request $request): JsonResponse
    {
        $request->validate([
            'booking_id' => 'required|exists:bookings,id',
        ]);

        $booking = Booking::findOrFail($request->booking_id);

        if ($booking->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        // Create COD payment record - auto-confirmed
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'method' => Payment::METHOD_CASH,
            'amount' => $booking->total_amount,
            'currency' => 'NPR',
            'status' => Payment::STATUS_COMPLETED,
            'paid_at' => now(),
            'request_data' => $request->all(),
        ]);

        // Confirm booking immediately for COD
        $booking->update([
            'status' => Booking::STATUS_CONFIRMED,
            'confirmed_at' => now(),
        ]);

        return response()->json([
            'payment' => $payment,
            'booking' => $booking,
            'message' => 'Booking confirmed with Cash on Delivery. Please pay at the venue.',
        ]);
    }
}
