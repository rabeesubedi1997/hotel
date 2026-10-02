<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\PackageBooking;
use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Services\LoyaltyService;
use App\Services\Payments\CurrencyConverter;
use App\Services\Payments\PaymentException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Customer-facing payment endpoints. Which gateways exist, their credentials
 * and sandbox/live mode live in the payment_gateways table (Admin → Payment
 * Gateways); the provider-specific work lives in App\Services\Payments\Drivers.
 *
 * A payment is only ever marked completed here, server-side, after the
 * driver has confirmed it with the provider (or for offline methods like
 * cash on delivery). Nothing the browser sends can complete a payment.
 */
class PaymentController extends Controller
{
    public function __construct(
        private LoyaltyService $loyalty,
        private CurrencyConverter $converter,
    ) {
    }

    /** Enabled, fully-configured gateways — what the checkout page renders. */
    public function methods(): JsonResponse
    {
        $methods = PaymentGateway::enabled()->ordered()->get()
            ->filter(fn (PaymentGateway $g) => $g->isConfigured())
            ->map(fn (PaymentGateway $g) => $g->toPublicArray())
            ->values();

        return response()->json(['methods' => $methods]);
    }

    /**
     * Start a payment with the given gateway. Offline gateways (cash) are
     * completed immediately; others return a `redirect_url` to send the
     * customer to the provider.
     */
    public function initiate(Request $request, string $code): JsonResponse
    {
        [$payable, $isPackage, $error] = $this->resolvePayable($request);
        if ($error) {
            return $error;
        }

        $gateway = PaymentGateway::enabled()->where('code', $code)->first();
        if (!$gateway || !$gateway->isConfigured()) {
            return response()->json(['message' => 'This payment method is not available.'], 422);
        }

        $driver = $gateway->driverInstance();
        $offline = $driver::isOffline();

        if (!$offline) {
            $request->validate(['return_url' => 'required|url']);
            if (parse_url($request->return_url, PHP_URL_HOST) !== $request->getHost()) {
                return response()->json(['message' => 'Invalid return URL.'], 422);
            }
        }

        try {
            [$amount, $rate] = $offline
                ? [(float) $payable->total_amount, 1.0]
                : $this->converter->convert((float) $payable->total_amount, $gateway->currency);
        } catch (PaymentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $payment = Payment::create([
            'booking_id' => $isPackage ? null : $payable->id,
            'package_booking_id' => $isPackage ? $payable->id : null,
            'method' => $driver::paymentMethod(),
            'gateway_code' => $gateway->code,
            'mode' => $gateway->mode,
            'amount' => $amount,
            'currency' => $offline ? config('payments.base_currency') : strtoupper($gateway->currency),
            'status' => Payment::STATUS_PENDING,
            'request_data' => [
                'base_amount' => (float) $payable->total_amount,
                'base_currency' => config('payments.base_currency'),
                'exchange_rate' => $rate,
            ],
        ]);

        try {
            $result = $driver->initiate($gateway, $payment, $this->buildContext($request, $payable, $payment, $gateway));
        } catch (PaymentException $e) {
            $payment->update(['status' => Payment::STATUS_FAILED]);

            return response()->json(['message' => $e->getMessage()], 422);
        }

        if ($result['completed'] ?? false) {
            $this->complete($payment, null, []);

            return response()->json([
                'status' => 'completed',
                'payment' => $payment->fresh(),
                'booking' => $payable->fresh(),
                'message' => 'Booking confirmed with ' . $gateway->name . '.',
            ]);
        }

        $payment->update([
            'status' => Payment::STATUS_INITIATED,
            'payment_intent_id' => $result['reference'],
            'response_data' => $result['raw'] ?? null,
        ]);

        return response()->json([
            'status' => 'redirect',
            'payment_id' => $payment->id,
            'redirect_url' => $result['redirect_url'],
        ]);
    }

    /**
     * Called by the return page after the provider redirects the customer
     * back. Asks the provider (via the stored reference) whether the payment
     * really succeeded — it never trusts what came back in the URL.
     */
    public function verify(Request $request, Payment $payment): JsonResponse
    {
        $isPackage = (bool) $payment->package_booking_id;
        $payable = $isPackage ? $payment->packageBooking : $payment->booking;

        if (!$payable || (int) $payable->user_id !== (int) Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($payment->isCompleted()) {
            return response()->json(['status' => 'completed', 'payment' => $payment, 'booking' => $payable, 'message' => 'Payment already confirmed.']);
        }

        if (!in_array($payment->status, [Payment::STATUS_INITIATED, Payment::STATUS_PENDING], true)) {
            return response()->json(['status' => 'failed', 'message' => 'This payment is no longer active. Please start a new payment.'], 422);
        }

        $gateway = PaymentGateway::where('code', $payment->gateway_code)->first();
        if (!$gateway) {
            return response()->json(['status' => 'failed', 'message' => 'This payment method is no longer available.'], 422);
        }

        try {
            $result = $gateway->driverInstance()->verify($gateway, $payment);
        } catch (PaymentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }

        if ($result['status'] === 'completed') {
            $this->complete($payment, $result['transaction_id'] ?? null, $result['raw'] ?? []);

            return response()->json([
                'status' => 'completed',
                'payment' => $payment->fresh(),
                'booking' => $payable->fresh(),
                'message' => 'Payment successful. Your booking is confirmed.',
            ]);
        }

        if ($result['status'] === 'failed') {
            $payment->update(['status' => Payment::STATUS_FAILED, 'response_data' => $result['raw'] ?? null]);

            return response()->json(['status' => 'failed', 'message' => 'The payment was not completed.'], 422);
        }

        return response()->json(['status' => 'pending', 'message' => 'The payment has not been completed yet.'], 202);
    }

    /** Legacy endpoint kept so already-loaded browser bundles still work. */
    public function createCODPayment(Request $request): JsonResponse
    {
        return $this->initiate($request, 'cod');
    }

    /**
     * Resolve the payable target from either `booking_id` or
     * `package_booking_id` — exactly one must be provided, owned by the
     * requesting user, and still awaiting payment.
     */
    private function resolvePayable(Request $request): array
    {
        $request->validate([
            'booking_id' => 'required_without:package_booking_id|nullable|exists:bookings,id',
            'package_booking_id' => 'required_without:booking_id|nullable|exists:package_bookings,id',
        ]);

        $isPackage = $request->filled('package_booking_id');
        $payable = $isPackage
            ? PackageBooking::findOrFail($request->package_booking_id)
            : Booking::findOrFail($request->booking_id);

        // (int) on both sides: some MySQL drivers return ids as strings.
        if ((int) $payable->user_id !== (int) Auth::id()) {
            return [null, $isPackage, response()->json(['message' => 'Unauthorized.'], 403)];
        }

        if (!$payable->isPending()) {
            return [null, $isPackage, response()->json(['message' => 'This booking is not awaiting payment.'], 422)];
        }

        return [$payable, $isPackage, null];
    }

    private function buildContext(Request $request, $payable, Payment $payment, PaymentGateway $gateway): array
    {
        $returnUrl = $request->filled('return_url')
            ? $this->withQuery($request->return_url, ['payment' => $payment->id, 'gateway' => $gateway->code])
            : null;

        return [
            'return_url' => $returnUrl,
            'cancel_url' => $returnUrl ? $this->withQuery($returnUrl, ['cancelled' => 1]) : null,
            'website_url' => $returnUrl ? parse_url($returnUrl, PHP_URL_SCHEME) . '://' . parse_url($returnUrl, PHP_URL_HOST) : null,
            'reference' => $payable->booking_number,
            'description' => 'Booking ' . $payable->booking_number,
            'customer' => [
                'name' => $payable->user?->name,
                'email' => $payable->user?->email,
            ],
        ];
    }

    private function withQuery(string $url, array $params): string
    {
        return $url . (str_contains($url, '?') ? '&' : '?') . http_build_query($params);
    }

    /**
     * Mark a payment completed and confirm what it paid for. Locked and
     * idempotent so a double-submitted return (refresh, two tabs) can't
     * confirm twice or award loyalty points twice.
     */
    private function complete(Payment $payment, ?string $transactionId, array $raw): void
    {
        DB::transaction(function () use ($payment, $transactionId, $raw) {
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->first();
            if ($payment->isCompleted()) {
                return;
            }

            $payment->update([
                'status' => Payment::STATUS_COMPLETED,
                'transaction_id' => $transactionId,
                'response_data' => $raw ?: $payment->response_data,
                'paid_at' => now(),
            ]);

            $isPackage = (bool) $payment->package_booking_id;
            $payable = $isPackage ? $payment->packageBooking : $payment->booking;

            // Money is recorded either way, but only a still-pending booking
            // gets confirmed (and earns points) — never twice.
            if ($payable->isPending()) {
                $this->confirmPayable($payable, $isPackage);
            }
        });
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
}
