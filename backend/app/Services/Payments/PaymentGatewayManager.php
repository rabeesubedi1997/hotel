<?php

namespace App\Services\Payments;

use App\Models\PaymentGateway;

class PaymentGatewayManager
{
    /** @return array<string,class-string<PaymentDriver>> */
    public function drivers(): array
    {
        return config('payments.drivers', []);
    }

    /** @return class-string<PaymentDriver>|null */
    public function driverClass(string $key): ?string
    {
        return $this->drivers()[$key] ?? null;
    }

    public function driver(PaymentGateway $gateway): PaymentDriver
    {
        $class = $this->driverClass($gateway->driver);

        if (!$class) {
            throw new PaymentException("Payment driver \"{$gateway->driver}\" is not installed.");
        }

        return new $class();
    }

    /** Driver catalogue for the admin "add / edit gateway" form. */
    public function schemas(): array
    {
        $out = [];
        foreach ($this->drivers() as $key => $class) {
            $out[] = [
                'key' => $key,
                'label' => $class::label(),
                'description' => $class::description(),
                'fields' => $class::fields(),
                'default_currency' => $class::defaultCurrency(),
                'supported_currencies' => $class::supportedCurrencies(),
                'offline' => $class::isOffline(),
                'default_api_urls' => $class::defaultApiUrls(),
            ];
        }

        return $out;
    }
}
