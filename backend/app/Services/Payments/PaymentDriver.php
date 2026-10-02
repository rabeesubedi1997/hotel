<?php

namespace App\Services\Payments;

use App\Models\Payment;
use App\Models\PaymentGateway;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * One payment provider integration. A driver is stateless: everything it
 * needs (credentials, mode) comes from the PaymentGateway row it is handed,
 * so the same driver can serve several configured gateways.
 *
 * initiate() returns:
 *   ['completed' => true]                                  offline method, nothing more to do
 *   ['redirect_url' => string, 'reference' => string,      customer must pay on the provider's page;
 *    'raw' => array]                                       `reference` is the provider's id for later verify()
 *
 * verify() returns:
 *   ['status' => 'completed'|'pending'|'failed',
 *    'transaction_id' => ?string, 'raw' => array]
 */
abstract class PaymentDriver
{
    abstract public static function key(): string;

    abstract public static function label(): string;

    /**
     * Credential fields the admin fills in for each mode (sandbox/live).
     *
     * @return array<int,array{key:string,label:string,type:string,secret:bool,required:bool,help?:string,placeholder?:string}>
     */
    abstract public static function fields(): array;

    abstract public function initiate(PaymentGateway $gateway, Payment $payment, array $context): array;

    abstract public function verify(PaymentGateway $gateway, Payment $payment): array;

    public static function description(): string
    {
        return '';
    }

    /**
     * Mode-independent, non-secret configuration fields (same shape as
     * fields(), plus optional 'group', 'default', 'options' for selects and
     * 'allowed_placeholders' for template fields). Most drivers have none.
     */
    public static function settingsFields(): array
    {
        return [];
    }

    public static function icon(): string
    {
        return 'wallet';
    }

    public static function defaultCurrency(): string
    {
        return config('payments.base_currency');
    }

    /** Null means any currency; otherwise the list of ISO codes the provider accepts. */
    public static function supportedCurrencies(): ?array
    {
        return null;
    }

    /** Offline methods (cash etc.) confirm instantly and never convert currency. */
    public static function isOffline(): bool
    {
        return false;
    }

    /** Value stored in payments.method. */
    public static function paymentMethod(): string
    {
        return static::key();
    }

    /** @return array{sandbox?:string,live?:string} */
    public static function defaultApiUrls(): array
    {
        return [];
    }

    /** Shared optional "API URL" override field, for drivers that talk to an HTTP API. */
    protected static function apiUrlField(): array
    {
        return [
            'key' => 'api_url',
            'label' => 'API URL',
            'type' => 'url',
            'secret' => false,
            'required' => false,
            'help' => 'Leave blank to use the provider default for the selected mode.',
        ];
    }

    public function testConnection(PaymentGateway $gateway): array
    {
        return ['ok' => true, 'message' => 'Credentials saved. This gateway has no connection test.'];
    }

    private const ZERO_DECIMAL_CURRENCIES = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];

    /** Amount in the currency's smallest unit (cents/paisa), 1:1 for zero-decimal currencies. */
    protected function toMinorUnits(string|float $amount, string $currency): int
    {
        $factor = in_array(strtoupper($currency), self::ZERO_DECIMAL_CURRENCIES, true) ? 1 : 100;

        return (int) round(((float) $amount) * $factor);
    }

    protected function apiUrl(PaymentGateway $gateway): string
    {
        $url = $gateway->credential('api_url') ?: (static::defaultApiUrls()[$gateway->mode] ?? '');

        return rtrim($url, '/');
    }

    protected function http(): PendingRequest
    {
        return Http::timeout(20)->acceptJson();
    }

    /**
     * Run a provider call, turning transport failures into a safe
     * PaymentException instead of leaking a stack trace to the customer.
     */
    protected function send(callable $request, string $action): Response
    {
        try {
            return $request();
        } catch (ConnectionException $e) {
            Log::error("Payment[{$this->logName()}] {$action}: connection failed", ['error' => $e->getMessage()]);
            throw new PaymentException('Could not reach the payment provider. Please try again.');
        }
    }

    protected function failFrom(Response $response, string $action): never
    {
        // Provider bodies can contain account details; keep them in the log only.
        Log::warning("Payment[{$this->logName()}] {$action} failed", [
            'status' => $response->status(),
            'body' => $response->json() ?? $response->body(),
        ]);

        throw new PaymentException('The payment provider rejected the request. Please try again or choose another payment method.');
    }

    private function logName(): string
    {
        return static::key();
    }
}
