<?php

namespace App\Services\Payments\Drivers;

use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Services\Payments\PaymentDriver;
use App\Services\Payments\PaymentException;

/**
 * Stripe Checkout (hosted page) — no Stripe.js or SDK needed.
 * Sandbox vs live is decided purely by which secret key is used
 * (sk_test_… / sk_live_…); both talk to the same API host.
 */
class StripeDriver extends PaymentDriver
{
    private const ZERO_DECIMAL = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];

    public static function key(): string
    {
        return 'stripe';
    }

    public static function label(): string
    {
        return 'Stripe';
    }

    public static function description(): string
    {
        return 'Credit / debit cards on a Stripe-hosted checkout page.';
    }

    public static function icon(): string
    {
        return 'credit-card';
    }

    public static function defaultApiUrls(): array
    {
        return ['sandbox' => 'https://api.stripe.com', 'live' => 'https://api.stripe.com'];
    }

    public static function fields(): array
    {
        return [
            [
                'key' => 'secret_key', 'label' => 'Secret Key', 'type' => 'password',
                'secret' => true, 'required' => true,
                'placeholder' => 'sk_test_… / sk_live_…',
                'help' => 'Stripe Dashboard → Developers → API keys.',
            ],
            [
                'key' => 'publishable_key', 'label' => 'Publishable Key', 'type' => 'text',
                'secret' => false, 'required' => false,
                'placeholder' => 'pk_test_… / pk_live_…',
                'help' => 'Not used by the hosted checkout; stored for future use.',
            ],
            static::apiUrlField(),
        ];
    }

    public function initiate(PaymentGateway $gateway, Payment $payment, array $context): array
    {
        $currency = strtolower($payment->currency);

        $response = $this->send(
            fn () => $this->http()
                ->asForm()
                ->withToken($gateway->credential('secret_key'))
                ->post($this->apiUrl($gateway) . '/v1/checkout/sessions', array_filter([
                    'mode' => 'payment',
                    // Stripe substitutes the literal placeholder itself.
                    'success_url' => $context['return_url'] . '&session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url' => $context['cancel_url'],
                    'client_reference_id' => (string) $payment->id,
                    'customer_email' => $context['customer']['email'] ?? null,
                    'metadata[payment_id]' => (string) $payment->id,
                    'line_items[0][quantity]' => 1,
                    'line_items[0][price_data][currency]' => $currency,
                    'line_items[0][price_data][unit_amount]' => $this->toMinorUnits($payment->amount, $payment->currency),
                    'line_items[0][price_data][product_data][name]' => $context['description'],
                ], fn ($v) => $v !== null)),
            'initiate'
        );

        if (!$response->successful() || !$response->json('url') || !$response->json('id')) {
            $this->failFrom($response, 'initiate');
        }

        return [
            'redirect_url' => $response->json('url'),
            'reference' => $response->json('id'),
            'raw' => ['id' => $response->json('id')],
        ];
    }

    public function verify(PaymentGateway $gateway, Payment $payment): array
    {
        if (!$payment->payment_intent_id) {
            throw new PaymentException('This payment was never started with the provider.');
        }

        $response = $this->send(
            fn () => $this->http()
                ->withToken($gateway->credential('secret_key'))
                ->get($this->apiUrl($gateway) . '/v1/checkout/sessions/' . $payment->payment_intent_id),
            'retrieve'
        );

        if (!$response->successful()) {
            $this->failFrom($response, 'retrieve');
        }

        $session = $response->json();

        if (($session['payment_status'] ?? null) === 'paid') {
            $expected = $this->toMinorUnits($payment->amount, $payment->currency);
            if ((int) ($session['amount_total'] ?? -1) !== $expected) {
                return ['status' => 'failed', 'transaction_id' => null, 'raw' => $session];
            }

            return [
                'status' => 'completed',
                'transaction_id' => is_string($session['payment_intent'] ?? null) ? $session['payment_intent'] : $session['id'],
                'raw' => ['id' => $session['id'], 'payment_status' => 'paid'],
            ];
        }

        $status = ($session['status'] ?? null) === 'expired' ? 'failed' : 'pending';

        return ['status' => $status, 'transaction_id' => null, 'raw' => ['id' => $session['id'] ?? null, 'status' => $session['status'] ?? null]];
    }

    public function testConnection(PaymentGateway $gateway): array
    {
        $response = $this->send(
            fn () => $this->http()->withToken($gateway->credential('secret_key'))->get($this->apiUrl($gateway) . '/v1/balance'),
            'test'
        );

        return $response->successful()
            ? ['ok' => true, 'message' => 'Connected to Stripe (' . $gateway->mode . ').']
            : ['ok' => false, 'message' => 'Stripe rejected these credentials.'];
    }

    private function toMinorUnits(string|float $amount, string $currency): int
    {
        $factor = in_array(strtoupper($currency), self::ZERO_DECIMAL, true) ? 1 : 100;

        return (int) round(((float) $amount) * $factor);
    }
}
