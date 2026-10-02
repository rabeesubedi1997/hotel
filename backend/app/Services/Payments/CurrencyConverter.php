<?php

namespace App\Services\Payments;

use App\Models\ExchangeRate;

/**
 * Prices are stored in the base currency (USD); this converts to whatever
 * currency a gateway actually charges in, using Admin → Currencies rates.
 */
class CurrencyConverter
{
    /** @return array{0: float, 1: float} [converted amount, rate used] */
    public function convert(float $amount, string $to): array
    {
        $base = strtoupper(config('payments.base_currency'));
        $to = strtoupper($to);

        if ($to === $base) {
            return [round($amount, 2), 1.0];
        }

        $rate = ExchangeRate::where('base_currency', $base)
            ->where('target_currency', $to)
            ->value('rate');

        if (!$rate || (float) $rate <= 0) {
            throw new PaymentException("This payment method is temporarily unavailable (no {$base} → {$to} exchange rate is configured).");
        }

        return [round($amount * (float) $rate, 2), (float) $rate];
    }
}
