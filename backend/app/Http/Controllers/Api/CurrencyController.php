<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExchangeRate;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class CurrencyController extends Controller
{
    // Base currency all prices are stored/entered in throughout the app
    // (hotel price_per_night, activity price, booking total_amount, etc).
    const BASE_CURRENCY = 'USD';

    const CURRENCY_SYMBOLS = [
        'USD' => '$',
        'NPR' => 'Rs.',
    ];

    public function rates(): JsonResponse
    {
        $rates = Cache::remember('exchange_rates', 3600, function () {
            return ExchangeRate::where('base_currency', self::BASE_CURRENCY)
                ->get(['target_currency', 'rate'])
                ->map(fn ($r) => [
                    'code' => $r->target_currency,
                    'symbol' => self::CURRENCY_SYMBOLS[$r->target_currency] ?? $r->target_currency,
                    'rate' => (float) $r->rate,
                ]);
        });

        return response()->json([
            'base_currency' => self::BASE_CURRENCY,
            'base_symbol' => self::CURRENCY_SYMBOLS[self::BASE_CURRENCY],
            'rates' => [
                ['code' => self::BASE_CURRENCY, 'symbol' => self::CURRENCY_SYMBOLS[self::BASE_CURRENCY], 'rate' => 1.0],
                ...$rates,
            ],
        ]);
    }
}
