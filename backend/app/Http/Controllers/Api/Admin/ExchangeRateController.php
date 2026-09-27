<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\CurrencyController;
use App\Models\AdminAuditLog;
use App\Models\ExchangeRate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ExchangeRateController extends Controller
{
    public function index(): JsonResponse
    {
        $rates = ExchangeRate::where('base_currency', CurrencyController::BASE_CURRENCY)->get();

        return response()->json([
            'base_currency' => CurrencyController::BASE_CURRENCY,
            'rates' => $rates,
        ]);
    }

    // Upsert a single target currency's rate — simple index/store shape,
    // mirroring Admin\SiteSettingController's key/value update pattern.
    public function upsert(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_currency' => 'required|string|size:3',
            'rate' => 'required|numeric|min:0.000001',
            'source' => 'nullable|string|max:50',
        ]);

        $rate = ExchangeRate::updateOrCreate(
            ['base_currency' => CurrencyController::BASE_CURRENCY, 'target_currency' => strtoupper($validated['target_currency'])],
            ['rate' => $validated['rate'], 'source' => $validated['source'] ?? 'manual', 'updated_by' => $request->user()->id]
        );

        Cache::forget('exchange_rates');

        AdminAuditLog::record($request->user(), 'update', 'ExchangeRate', $rate->id, null, null, $rate->toArray());

        return response()->json([
            'rate' => $rate,
            'message' => 'Exchange rate updated successfully.',
        ]);
    }

    public function destroy(Request $request, ExchangeRate $exchangeRate): JsonResponse
    {
        AdminAuditLog::record($request->user(), 'delete', 'ExchangeRate', $exchangeRate->id, null, $exchangeRate->toArray(), null);

        $exchangeRate->delete();
        Cache::forget('exchange_rates');

        return response()->json(['message' => 'Exchange rate deleted successfully.']);
    }
}
