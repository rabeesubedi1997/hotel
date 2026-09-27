<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $coupons = Coupon::withCount('redemptions')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($coupons);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:coupons,code',
            'description' => 'nullable|string|max:255',
            'type' => 'required|in:flat,percent',
            'value' => 'required|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'applicable_to' => 'required|in:all,hotels,activities,packages,tour_guides',
            'usage_limit' => 'nullable|integer|min:1',
            'usage_limit_per_user' => 'integer|min:1',
            'valid_from' => 'nullable|date',
            'valid_until' => 'nullable|date|after_or_equal:valid_from',
            'is_active' => 'boolean',
        ]);

        $validated['created_by'] = $request->user()->id;
        $coupon = Coupon::create($validated);

        AdminAuditLog::record($request->user(), 'create', 'Coupon', $coupon->id, null, null, $coupon->toArray());

        return response()->json([
            'coupon' => $coupon,
            'message' => 'Coupon created successfully.',
        ], 201);
    }

    public function show(Coupon $coupon): JsonResponse
    {
        return response()->json($coupon->loadCount('redemptions'));
    }

    public function update(Request $request, Coupon $coupon): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'sometimes|string|max:50|unique:coupons,code,' . $coupon->id,
            'description' => 'nullable|string|max:255',
            'type' => 'sometimes|in:flat,percent',
            'value' => 'sometimes|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'applicable_to' => 'sometimes|in:all,hotels,activities,packages,tour_guides',
            'usage_limit' => 'nullable|integer|min:1',
            'usage_limit_per_user' => 'integer|min:1',
            'valid_from' => 'nullable|date',
            'valid_until' => 'nullable|date|after_or_equal:valid_from',
            'is_active' => 'boolean',
        ]);

        $before = $coupon->only(array_keys($validated));
        $coupon->update($validated);

        AdminAuditLog::record($request->user(), 'update', 'Coupon', $coupon->id, null, $before, $coupon->only(array_keys($validated)));

        return response()->json([
            'coupon' => $coupon,
            'message' => 'Coupon updated successfully.',
        ]);
    }

    public function destroy(Request $request, Coupon $coupon): JsonResponse
    {
        AdminAuditLog::record($request->user(), 'delete', 'Coupon', $coupon->id, null, $coupon->toArray(), null);

        $coupon->delete();

        return response()->json(['message' => 'Coupon deleted successfully.']);
    }

    public function toggleActive(Request $request, Coupon $coupon): JsonResponse
    {
        $coupon->update(['is_active' => !$coupon->is_active]);

        AdminAuditLog::record($request->user(), 'update', 'Coupon', $coupon->id, null, null, ['is_active' => $coupon->is_active]);

        return response()->json([
            'coupon' => $coupon,
            'message' => 'Coupon status updated.',
        ]);
    }

    public function redemptions(Coupon $coupon): JsonResponse
    {
        $redemptions = $coupon->redemptions()
            ->with(['user:id,name,email', 'booking:id,booking_number,total_amount'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($redemptions);
    }
}
