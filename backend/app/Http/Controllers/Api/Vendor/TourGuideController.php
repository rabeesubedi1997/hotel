<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Concerns\ActsForVendor;
use App\Http\Controllers\Controller;
use App\Models\TourGuide;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TourGuideController extends Controller
{
    use ActsForVendor;

    private const VALIDATION_RULES = [
        'name' => 'required|string|max:255',
        'image' => 'nullable|string',
        'role' => 'nullable|string|max:255',
        'bio' => 'nullable|string',
        'is_available_for_hire' => 'boolean',
        'hire_price_per_day' => 'nullable|numeric|min:0',
        'languages' => 'nullable|array',
        'specialties' => 'nullable|array',
        'certifications' => 'nullable|array',
        'phone' => 'nullable|string|max:255',
        'email' => 'nullable|email|max:255',
    ];

    public function index(Request $request): JsonResponse
    {
        $guides = TourGuide::where('vendor_id', $this->vendorId($request))
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($guides);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $guide = TourGuide::where('vendor_id', $this->vendorId($request))->findOrFail($id);

        return response()->json($guide);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(self::VALIDATION_RULES);

        $validated['vendor_id'] = $this->vendorId($request);
        $validated['approval_status'] = TourGuide::APPROVAL_STATUS_PENDING;

        $guide = TourGuide::create($validated);

        return response()->json([
            'message' => 'Tour guide service submitted for approval',
            'guide' => $guide,
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $guide = TourGuide::where('vendor_id', $this->vendorId($request))->findOrFail($id);

        $validated = $request->validate(array_map(
            fn ($rule) => str_starts_with($rule, 'required') ? 'sometimes|' . $rule : $rule,
            self::VALIDATION_RULES
        ));

        $guide->update($validated);

        return response()->json([
            'message' => 'Tour guide service updated successfully',
            'guide' => $guide,
        ]);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $guide = TourGuide::where('vendor_id', $this->vendorId($request))->findOrFail($id);
        $guide->delete();

        return response()->json(['message' => 'Tour guide service deleted successfully']);
    }
}
