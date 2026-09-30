<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Vendor\Concerns\ResolvesRestaurantOwner;
use App\Models\RestaurantStaff;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Lets a Hotel/Activity owner grant an existing user Kitchen Display-only
 * access to their Restaurant POS, without handing over the full vendor
 * account — see the restaurant_staff migration for why this table exists
 * alongside the restaurant.kitchen.* permissions.
 */
class RestaurantStaffController extends Controller
{
    use ResolvesRestaurantOwner;

    public function index(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        return response()->json($owner->restaurantStaff()->with('user:id,name,email')->get());
    }

    public function store(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        $staffUser = User::where('email', $validated['email'])->first();
        if (!$staffUser) {
            return response()->json(['message' => 'No user with that email exists. They need an account first.'], 404);
        }
        if ($staffUser->id === $owner->user_id) {
            return response()->json(['message' => 'This user already owns the property — they have full access.'], 422);
        }

        $staffUser->assignRole('kitchen_staff');

        $staff = RestaurantStaff::firstOrCreate([
            'user_id' => $staffUser->id,
            'owner_type' => get_class($owner),
            'owner_id' => $owner->id,
        ]);

        return response()->json([
            'message' => 'Kitchen access granted',
            'staff' => $staff->load('user:id,name,email'),
        ], 201);
    }

    public function destroy($staffId)
    {
        $user = auth()->user();
        $staff = RestaurantStaff::findOrFail($staffId);
        $owner = $staff->owner;

        if (!$user->isAdminLevel() && (!$owner || $owner->user_id !== $user->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $staff->delete();

        return response()->json(['message' => 'Kitchen access revoked']);
    }
}
