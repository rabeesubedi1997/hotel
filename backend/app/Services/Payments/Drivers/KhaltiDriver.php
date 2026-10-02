<?php

namespace App\Services\Payments\Drivers;

use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Services\Payments\PaymentDriver;
use App\Services\Payments\PaymentException;

/**
 * Khalti ePayment (v2) — hosted redirect flow.
 * Docs: https://docs.khalti.com/khalti-epayment/
 */
class KhaltiDriver extends PaymentDriver
{
    public static function key(): string
    {
        return 'khalti';
    }

    public static function label(): string
    {
        return 'Khalti';
    }

    public static function description(): string
    {
        return 'Nepal digital wallet. Charges in NPR (amounts are converted from the base currency).';
    }

    public static function icon(): string
    {
        return 'wallet';
    }

    public static function defaultCurrency(): string
    {
        return 'NPR';
    }

    public static function supportedCurrencies(): ?array
    {
        return ['NPR'];
    }

    public static function defaultApiUrls(): array
    {
        return [
            'sandbox' => 'https://dev.khalti.com/api/v2',
            'live' => 'https://khalti.com/api/v2',
        ];
    }

    public static function fields(): array
    {
        return [
            [
                'key' => 'secret_key', 'label' => 'Secret Key', 'type' => 'password',
                'secret' => true, 'required' => true,
                'help' => 'From the Khalti merchant dashboard (test keys for sandbox, live keys for live).',
            ],
            static::apiUrlField(),
        ];
    }

    public function initiate(PaymentGateway $gateway, Payment $payment, array $context): array
    {
        $response = $this->send(
            fn () => $this->http()
                ->withHeaders(['Authorization' => 'Key ' . $gateway->credential('secret_key')])
                ->post($this->apiUrl($gateway) . '/epayment/initiate/', [
                    'return_url' => $context['return_url'],
                    'website_url' => $context['website_url'],
                    'amount' => $this->toPaisa($payment->amount),
                    'purchase_order_id' => $context['reference'] . '-' . $payment->id,
                    'purchase_order_name' => $context['description'],
                    'customer_info' => array_filter([
                        'name' => $context['customer']['name'] ?? null,
                        'email' => $context['customer']['email'] ?? null,
                    ]),
                ]),
            'initiate'
        );

        if (!$response->successful() || !$response->json('payment_url') || !$response->json('pidx')) {
            $this->failFrom($response, 'initiate');
        }

        return [
            'redirect_url' => $response->json('payment_url'),
            'reference' => $response->json('pidx'),
            'raw' => $response->json(),
        ];
    }

    public function verify(PaymentGateway $gateway, Payment $payment): array
    {
        if (!$payment->payment_intent_id) {
            throw new PaymentException('This payment was never started with the provider.');
        }

        $response = $this->send(
            fn () => $this->http()
                ->withHeaders(['Authorization' => 'Key ' . $gateway->credential('secret_key')])
                ->post($this->apiUrl($gateway) . '/epayment/lookup/', ['pidx' => $payment->payment_intent_id]),
            'lookup'
        );

        if (!$response->successful()) {
            $this->failFrom($response, 'lookup');
        }

        $status = $response->json('status');

        if ($status === 'Completed') {
            // Never trust the redirect alone: the provider must confirm the
            // exact amount we asked for.
            if ((int) $response->json('total_amount') !== $this->toPaisa($payment->amount)) {
                return ['status' => 'failed', 'transaction_id' => null, 'raw' => $response->json()];
            }

            return [
                'status' => 'completed',
                'transaction_id' => $response->json('transaction_id'),
                'raw' => $response->json(),
            ];
        }

        $pending = in_array($status, ['Pending', 'Initiated'], true);

        return ['status' => $pending ? 'pending' : 'failed', 'transaction_id' => null, 'raw' => $response->json()];
    }

    private function toPaisa(string|float $amount): int
    {
        return (int) round(((float) $amount) * 100);
    }
}
