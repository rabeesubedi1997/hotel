<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    public function __construct(private CouponService $coupons)
    {
    }

    public function validate(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
            'order_amount' => 'required|numeric|min:0',
            'bookable_scope' => 'nullable|string|in:hotels,activities,packages,tour_guides',
        ]);

        $result = $this->coupons->evaluate(
            $request->code,
            $request->user(),
            (float) $request->order_amount,
            $request->bookable_scope ?? 'all'
        );

        return response()->json([
            'valid' => $result['valid'],
            'message' => $result['message'],
            'discount_amount' => $result['discount_amount'],
        ]);
    }
}
