<?php

namespace App\Services\Payments\Drivers;

use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Services\Payments\PaymentDriver;
use App\Services\Payments\PaymentException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Log;

/**
 * A gateway configured entirely from the admin screen — no code. It covers
 * the common "hosted payment page" shape used by most modern providers:
 *
 *   1. POST to the provider to create a payment  →  response holds a pay URL + an id
 *   2. customer is redirected to that URL and pays
 *   3. we call the provider again (GET/POST) with that id and read a status field
 *
 * What it can NOT do: providers that need a locally computed signature/HMAC
 * or a browser form-POST (e.g. eSewa) — those need a dedicated driver class.
 */
class CustomDriver extends PaymentDriver
{
    /** Placeholders usable in the create-payment request (typed: *_minor is an int, amount a float). */
    private const INITIATE_PLACEHOLDERS = [
        'amount', 'amount_minor', 'amount_string', 'currency', 'currency_lower',
        'order_id', 'booking_number', 'description', 'return_url', 'cancel_url', 'website_url',
        'customer_name', 'customer_email', 'payment_id',
    ];

    public static function key(): string
    {
        return 'custom';
    }

    public static function label(): string
    {
        return 'Custom gateway (configure from admin)';
    }

    public static function description(): string
    {
        return 'Connect any provider with a hosted payment page and a REST API — set its URLs, authentication and how to read its responses below. No developer needed.';
    }

    public static function icon(): string
    {
        return 'credit-card';
    }

    public static function fields(): array
    {
        return [
            [
                'key' => 'api_url', 'label' => 'API base URL', 'type' => 'url', 'secret' => false, 'required' => true,
                'placeholder' => 'https://api.example-gateway.com',
                'help' => 'Different for sandbox and live. Must be https.',
            ],
            [
                'key' => 'api_key', 'label' => 'API key / secret key', 'type' => 'password', 'secret' => true, 'required' => true,
            ],
            [
                'key' => 'api_secret', 'label' => 'API secret (only for "Basic" authentication)', 'type' => 'password', 'secret' => true, 'required' => false,
                'help' => 'Used as the password when authentication is Basic; the API key is the username.',
            ],
        ];
    }

    public static function settingsFields(): array
    {
        $placeholders = array_map(fn ($p) => '{' . $p . '}', self::INITIATE_PLACEHOLDERS);
        $placeholderHelp = 'Available: ' . implode(' ', $placeholders);

        return [
            // ── Authentication ──
            [
                'group' => 'Authentication', 'key' => 'auth_type', 'label' => 'How to send the API key', 'type' => 'select',
                'required' => true, 'default' => 'bearer',
                'options' => [
                    ['value' => 'bearer', 'label' => 'Bearer token  (Authorization: Bearer <key>)'],
                    ['value' => 'header', 'label' => 'Custom header  (e.g. X-Api-Key: <key>)'],
                    ['value' => 'basic', 'label' => 'Basic auth  (key as username)'],
                    ['value' => 'none', 'label' => 'None'],
                ],
            ],
            [
                'group' => 'Authentication', 'key' => 'auth_header', 'label' => 'Header name (Custom header only)', 'type' => 'text', 'required' => false,
                'placeholder' => 'Authorization',
            ],
            [
                'group' => 'Authentication', 'key' => 'auth_prefix', 'label' => 'Header value prefix (Custom header only)', 'type' => 'text', 'required' => false,
                'placeholder' => 'Key ', 'help' => 'Text placed before the key, e.g. "Key " gives "Authorization: Key <key>".',
            ],
            [
                'group' => 'Authentication', 'key' => 'extra_headers', 'label' => 'Extra headers (JSON, optional)', 'type' => 'json', 'required' => false,
                'placeholder' => '{"Accept-Version": "2"}',
            ],

            // ── Create payment ──
            [
                'group' => 'Create payment request', 'key' => 'initiate_path', 'label' => 'Create-payment path', 'type' => 'text', 'required' => true,
                'placeholder' => '/v1/payments', 'help' => 'Appended to the API base URL. A full https:// URL also works.',
            ],
            [
                'group' => 'Create payment request', 'key' => 'request_format', 'label' => 'Send body as', 'type' => 'select',
                'required' => true, 'default' => 'json',
                'options' => [['value' => 'json', 'label' => 'JSON'], ['value' => 'form', 'label' => 'Form fields (x-www-form-urlencoded)']],
            ],
            [
                'group' => 'Create payment request', 'key' => 'initiate_body', 'label' => 'Request body (JSON template)', 'type' => 'json', 'required' => true,
                'placeholder' => "{\n  \"amount\": \"{amount_minor}\",\n  \"currency\": \"{currency}\",\n  \"order_id\": \"{order_id}\",\n  \"redirect_url\": \"{return_url}\"\n}",
                'help' => $placeholderHelp . '. A value that is exactly one placeholder keeps its type (number stays a number).',
                'allowed_placeholders' => self::INITIATE_PLACEHOLDERS,
            ],
            [
                'group' => 'Create payment request', 'key' => 'redirect_path', 'label' => 'Where is the pay-page URL in the response?', 'type' => 'text', 'required' => true,
                'placeholder' => 'data.payment_url', 'help' => 'Dot path into the JSON response, e.g. data.payment_url',
            ],
            [
                'group' => 'Create payment request', 'key' => 'reference_path', 'label' => 'Where is the provider\'s payment id in the response?', 'type' => 'text', 'required' => true,
                'placeholder' => 'data.id', 'help' => 'Saved and used later to check the payment.',
            ],

            // ── Verify payment ──
            [
                'group' => 'Check payment result', 'key' => 'verify_path', 'label' => 'Check-payment path', 'type' => 'text', 'required' => true,
                'placeholder' => '/v1/payments/{provider_reference}', 'help' => 'Use {provider_reference} for the id saved above.',
                'allowed_placeholders' => ['provider_reference'],
            ],
            [
                'group' => 'Check payment result', 'key' => 'verify_method', 'label' => 'Check with', 'type' => 'select',
                'required' => true, 'default' => 'GET',
                'options' => [['value' => 'GET', 'label' => 'GET'], ['value' => 'POST', 'label' => 'POST']],
            ],
            [
                'group' => 'Check payment result', 'key' => 'verify_body', 'label' => 'Check body (JSON template, POST only)', 'type' => 'json', 'required' => false,
                'placeholder' => '{"id": "{provider_reference}"}',
                'help' => 'Same placeholders as above, plus {provider_reference}.',
                'allowed_placeholders' => array_merge(self::INITIATE_PLACEHOLDERS, ['provider_reference']),
            ],
            [
                'group' => 'Check payment result', 'key' => 'status_path', 'label' => 'Where is the payment status in the response?', 'type' => 'text', 'required' => true,
                'placeholder' => 'data.status',
            ],
            [
                'group' => 'Check payment result', 'key' => 'success_values', 'label' => 'Status values that mean PAID', 'type' => 'text', 'required' => true,
                'placeholder' => 'paid, completed, success', 'help' => 'Comma-separated, not case-sensitive.',
            ],
            [
                'group' => 'Check payment result', 'key' => 'pending_values', 'label' => 'Status values that mean STILL PENDING (optional)', 'type' => 'text', 'required' => false,
                'placeholder' => 'pending, initiated', 'help' => 'Anything not listed as paid or pending is treated as failed.',
            ],
            [
                'group' => 'Check payment result', 'key' => 'transaction_path', 'label' => 'Where is the transaction id? (optional)', 'type' => 'text', 'required' => false,
                'placeholder' => 'data.transaction_id',
            ],
            [
                'group' => 'Check payment result', 'key' => 'amount_path', 'label' => 'Where is the paid amount? (optional but recommended)', 'type' => 'text', 'required' => false,
                'placeholder' => 'data.amount', 'help' => 'If set, a payment whose amount does not match is rejected.',
            ],
            [
                'group' => 'Check payment result', 'key' => 'amount_unit', 'label' => 'That amount is in', 'type' => 'select',
                'required' => false, 'default' => 'major',
                'options' => [['value' => 'major', 'label' => 'Normal units (100.00)'], ['value' => 'minor', 'label' => 'Smallest unit (10000 cents/paisa)']],
            ],
        ];
    }

    public function initiate(PaymentGateway $gateway, Payment $payment, array $context): array
    {
        $vars = $this->variables($payment, $context);
        $body = $this->render($gateway->setting('initiate_body'), $vars);

        $response = $this->send(function () use ($gateway, $body) {
            $request = $this->request($gateway);
            $request = $gateway->setting('request_format') === 'form' ? $request->asForm() : $request->asJson();

            return $request->post($this->url($gateway, $gateway->setting('initiate_path')), $body);
        }, 'initiate');

        if (!$response->successful()) {
            $this->failFrom($response, 'initiate');
        }

        $json = $response->json() ?? [];
        $redirect = data_get($json, $gateway->setting('redirect_path'));
        $reference = data_get($json, $gateway->setting('reference_path'));

        // The redirect URL comes from a third party and is sent straight to
        // the browser — only a real http(s) URL is acceptable (never javascript:).
        if (!is_string($redirect) || !$this->isWebUrl($redirect) || !is_scalar($reference) || (string) $reference === '') {
            Log::warning('Payment[custom] initiate: response did not contain a usable pay URL / id', [
                'gateway' => $gateway->code,
                'redirect_path' => $gateway->setting('redirect_path'),
                'reference_path' => $gateway->setting('reference_path'),
                'status' => $response->status(),
                'body' => $json,
            ]);
            throw new PaymentException('The payment provider did not return a payment page. Please try again or choose another payment method.');
        }

        return ['redirect_url' => $redirect, 'reference' => (string) $reference, 'raw' => ['reference' => (string) $reference]];
    }

    public function verify(PaymentGateway $gateway, Payment $payment): array
    {
        if (!$payment->payment_intent_id) {
            throw new PaymentException('This payment was never started with the provider.');
        }

        $vars = $this->variables($payment, []) + ['provider_reference' => $payment->payment_intent_id];
        $path = str_replace('{provider_reference}', rawurlencode($payment->payment_intent_id), $gateway->setting('verify_path'));
        $isPost = strtoupper($gateway->setting('verify_method', 'GET')) === 'POST';
        $body = $isPost ? $this->render($gateway->setting('verify_body'), $vars) : [];

        $response = $this->send(function () use ($gateway, $path, $isPost, $body) {
            $request = $this->request($gateway);
            $url = $this->url($gateway, $path);

            if (!$isPost) {
                return $request->get($url);
            }

            return $gateway->setting('request_format') === 'form'
                ? $request->asForm()->post($url, $body)
                : $request->asJson()->post($url, $body);
        }, 'verify');

        if (!$response->successful()) {
            $this->failFrom($response, 'verify');
        }

        $json = $response->json() ?? [];
        $status = strtolower(trim((string) data_get($json, $gateway->setting('status_path'))));
        $success = $this->csv($gateway->setting('success_values'));
        $pending = $this->csv($gateway->setting('pending_values'));

        if ($status !== '' && in_array($status, $success, true)) {
            if (!$this->amountMatches($gateway, $payment, $json)) {
                return ['status' => 'failed', 'transaction_id' => null, 'raw' => ['reason' => 'amount mismatch']];
            }

            $txn = $gateway->setting('transaction_path') ? data_get($json, $gateway->setting('transaction_path')) : null;

            return [
                'status' => 'completed',
                'transaction_id' => is_scalar($txn) ? (string) $txn : null,
                'raw' => ['status' => $status],
            ];
        }

        $isPending = $status !== '' && in_array($status, $pending, true);

        return ['status' => $isPending ? 'pending' : 'failed', 'transaction_id' => null, 'raw' => ['status' => $status]];
    }

    private function amountMatches(PaymentGateway $gateway, Payment $payment, array $json): bool
    {
        $path = $gateway->setting('amount_path');
        if (!$path) {
            return true; // admin opted out of amount verification
        }

        $reported = data_get($json, $path);
        if (!is_numeric($reported)) {
            return false;
        }

        return $gateway->setting('amount_unit') === 'minor'
            ? (int) round((float) $reported) === $this->toMinorUnits($payment->amount, $payment->currency)
            : abs((float) $reported - (float) $payment->amount) < 0.005;
    }

    /** @return array<string,mixed> */
    private function variables(Payment $payment, array $context): array
    {
        $amount = round((float) $payment->amount, 2);
        $currency = strtoupper($payment->currency);

        return [
            'amount' => $amount,
            'amount_minor' => $this->toMinorUnits($amount, $currency),
            'amount_string' => number_format($amount, 2, '.', ''),
            'currency' => $currency,
            'currency_lower' => strtolower($currency),
            'order_id' => ($context['reference'] ?? 'payment') . '-' . $payment->id,
            'booking_number' => (string) ($context['reference'] ?? ''),
            'description' => (string) ($context['description'] ?? ''),
            'return_url' => (string) ($context['return_url'] ?? ''),
            'cancel_url' => (string) ($context['cancel_url'] ?? ''),
            'website_url' => (string) ($context['website_url'] ?? ''),
            'customer_name' => (string) ($context['customer']['name'] ?? ''),
            'customer_email' => (string) ($context['customer']['email'] ?? ''),
            'payment_id' => $payment->id,
        ];
    }

    /** Fill {placeholders} in a JSON template; a value that is exactly one placeholder keeps its real type. */
    private function render(?string $template, array $vars): array
    {
        $decoded = $template ? json_decode($template, true) : [];

        return is_array($decoded) ? $this->renderValue($decoded, $vars) : [];
    }

    private function renderValue(mixed $value, array $vars): mixed
    {
        if (is_array($value)) {
            return array_map(fn ($v) => $this->renderValue($v, $vars), $value);
        }

        if (!is_string($value)) {
            return $value;
        }

        if (preg_match('/^\{(\w+)\}$/', $value, $m) && array_key_exists($m[1], $vars)) {
            return $vars[$m[1]];
        }

        return preg_replace_callback(
            '/\{(\w+)\}/',
            fn ($m) => array_key_exists($m[1], $vars) ? (string) $vars[$m[1]] : $m[0],
            $value
        );
    }

    private function request(PaymentGateway $gateway): PendingRequest
    {
        $request = $this->http();
        $key = (string) $gateway->credential('api_key');

        switch ($gateway->setting('auth_type', 'bearer')) {
            case 'bearer':
                $request = $request->withToken($key);
                break;
            case 'header':
                $request = $request->withHeaders([($gateway->setting('auth_header') ?: 'Authorization') => ($gateway->setting('auth_prefix') ?? '') . $key]);
                break;
            case 'basic':
                $request = $request->withBasicAuth($key, (string) $gateway->credential('api_secret'));
                break;
        }

        $extra = $gateway->setting('extra_headers') ? json_decode($gateway->setting('extra_headers'), true) : [];

        return is_array($extra) && $extra ? $request->withHeaders($extra) : $request;
    }

    private function url(PaymentGateway $gateway, string $path): string
    {
        $path = trim($path);

        if (preg_match('#^https://#i', $path)) {
            return $path;
        }

        $base = rtrim((string) $gateway->credential('api_url'), '/');
        if ($base === '') {
            throw new PaymentException('This payment method is not fully configured.');
        }

        return $base . '/' . ltrim($path, '/');
    }

    private function isWebUrl(string $url): bool
    {
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));

        return filter_var($url, FILTER_VALIDATE_URL) && ($scheme === 'https' || ($scheme === 'http' && app()->environment('local')));
    }

    /** @return string[] */
    private function csv(?string $value): array
    {
        return array_values(array_filter(array_map(fn ($v) => strtolower(trim($v)), explode(',', (string) $value)), fn ($v) => $v !== ''));
    }
}
