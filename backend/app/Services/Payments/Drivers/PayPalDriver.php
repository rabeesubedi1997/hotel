<?php

namespace App\Services\Payments\Drivers;

use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Services\Payments\PaymentDriver;
use App\Services\Payments\PaymentException;

/**
 * PayPal Orders v2 — redirect to PayPal to approve, then capture on return.
 */
class PayPalDriver extends PaymentDriver
{
    public static function key(): string
    {
        return 'paypal';
    }

    public static function label(): string
    {
        return 'PayPal';
    }

    public static function description(): string
    {
        return 'Pay with a PayPal account or card via PayPal.';
    }

    public static function icon(): string
    {
        return 'paypal';
    }

    public static function defaultApiUrls(): array
    {
        return [
            'sandbox' => 'https://api-m.sandbox.paypal.com',
            'live' => 'https://api-m.paypal.com',
        ];
    }

    public static function fields(): array
    {
        return [
            [
                'key' => 'client_id', 'label' => 'Client ID', 'type' => 'text',
                'secret' => false, 'required' => true,
                'help' => 'PayPal Developer Dashboard → Apps & Credentials (use the Sandbox or Live tab to match the mode).',
            ],
            [
                'key' => 'client_secret', 'label' => 'Client Secret', 'type' => 'password',
                'secret' => true, 'required' => true,
            ],
            static::apiUrlField(),
        ];
    }

    public function initiate(PaymentGateway $gateway, Payment $payment, array $context): array
    {
        $token = $this->accessToken($gateway);

        $response = $this->send(
            fn () => $this->http()
                ->withToken($token)
                ->withHeaders(['PayPal-Request-Id' => 'payment-' . $payment->id])
                ->post($this->apiUrl($gateway) . '/v2/checkout/orders', [
                    'intent' => 'CAPTURE',
                    'purchase_units' => [[
                        'reference_id' => (string) $payment->id,
                        'description' => $context['description'],
                        'amount' => [
                            'currency_code' => strtoupper($payment->currency),
                            'value' => number_format((float) $payment->amount, 2, '.', ''),
                        ],
                    ]],
                    'payment_source' => ['paypal' => ['experience_context' => [
                        'return_url' => $context['return_url'],
                        'cancel_url' => $context['cancel_url'],
                        'user_action' => 'PAY_NOW',
                    ]]],
                ]),
            'create order'
        );

        if (!$response->successful()) {
            $this->failFrom($response, 'create order');
        }

        $link = collect($response->json('links', []))
            ->first(fn ($l) => in_array($l['rel'] ?? '', ['payer-action', 'approve'], true));

        if (!$link || !$response->json('id')) {
            $this->failFrom($response, 'create order (no approval link)');
        }

        return [
            'redirect_url' => $link['href'],
            'reference' => $response->json('id'),
            'raw' => ['id' => $response->json('id')],
        ];
    }

    public function verify(PaymentGateway $gateway, Payment $payment): array
    {
        if (!$payment->payment_intent_id) {
            throw new PaymentException('This payment was never started with the provider.');
        }

        $token = $this->accessToken($gateway);
        $base = $this->apiUrl($gateway) . '/v2/checkout/orders/' . $payment->payment_intent_id;

        $response = $this->send(
            fn () => $this->http()->withToken($token)->withBody('{}', 'application/json')->post($base . '/capture'),
            'capture'
        );

        // Returning twice (refresh / back button) hits "already captured" —
        // that's success, so read the order instead of failing.
        if ($response->status() === 422 && str_contains((string) $response->body(), 'ORDER_ALREADY_CAPTURED')) {
            $response = $this->send(fn () => $this->http()->withToken($token)->get($base), 'retrieve');
        }

        if (!$response->successful()) {
            // Not approved yet (customer abandoned PayPal) is a normal "pending".
            if (str_contains((string) $response->body(), 'ORDER_NOT_APPROVED')) {
                return ['status' => 'pending', 'transaction_id' => null, 'raw' => []];
            }
            $this->failFrom($response, 'capture');
        }

        $order = $response->json();

        if (($order['status'] ?? null) === 'COMPLETED') {
            $capture = $order['purchase_units'][0]['payments']['captures'][0] ?? [];
            $paid = number_format((float) ($capture['amount']['value'] ?? 0), 2, '.', '');
            $expected = number_format((float) $payment->amount, 2, '.', '');

            if ($paid !== $expected || strtoupper($capture['amount']['currency_code'] ?? '') !== strtoupper($payment->currency)) {
                return ['status' => 'failed', 'transaction_id' => null, 'raw' => ['id' => $order['id'] ?? null]];
            }

            return [
                'status' => 'completed',
                'transaction_id' => $capture['id'] ?? $order['id'] ?? null,
                'raw' => ['id' => $order['id'] ?? null, 'status' => 'COMPLETED'],
            ];
        }

        $pending = in_array($order['status'] ?? null, ['CREATED', 'APPROVED', 'PAYER_ACTION_REQUIRED'], true);

        return ['status' => $pending ? 'pending' : 'failed', 'transaction_id' => null, 'raw' => ['status' => $order['status'] ?? null]];
    }

    public function testConnection(PaymentGateway $gateway): array
    {
        try {
            $this->accessToken($gateway);
        } catch (PaymentException $e) {
            return ['ok' => false, 'message' => 'PayPal rejected these credentials.'];
        }

        return ['ok' => true, 'message' => 'Connected to PayPal (' . $gateway->mode . ').'];
    }

    private function accessToken(PaymentGateway $gateway): string
    {
        $response = $this->send(
            fn () => $this->http()
                ->asForm()
                ->withBasicAuth((string) $gateway->credential('client_id'), (string) $gateway->credential('client_secret'))
                ->post($this->apiUrl($gateway) . '/v1/oauth2/token', ['grant_type' => 'client_credentials']),
            'oauth token'
        );

        if (!$response->successful() || !$response->json('access_token')) {
            $this->failFrom($response, 'oauth token');
        }

        return $response->json('access_token');
    }
}
