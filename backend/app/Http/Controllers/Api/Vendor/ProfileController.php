<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Concerns\ActsForVendor;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Lets a vendor manage their own public storefront profile (see
 * VendorProfile.jsx / /vendors/{slug}) — company name, bio, avatar, and
 * cover image. Previously only Admin\VendorController could edit
 * company_name; vendors had no self-service way to set any of these.
 */
class ProfileController extends Controller
{
    use ActsForVendor;

    public function show(Request $request): JsonResponse
    {
        $vendor = User::where('role', 'vendor')->findOrFail($this->vendorId($request));

        return response()->json($vendor);
    }

    public function update(Request $request): JsonResponse
    {
        $vendor = User::where('role', 'vendor')->findOrFail($this->vendorId($request));

        $validated = $request->validate([
            'company_name' => 'nullable|string|max:255',
            'bio' => 'nullable|string|max:2000',
            'avatar' => 'nullable|string',
            'cover_image' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
        ]);

        $vendor->update($validated);

        return response()->json([
            'message' => 'Business profile updated successfully',
            'vendor' => $vendor,
        ]);
    }
}
