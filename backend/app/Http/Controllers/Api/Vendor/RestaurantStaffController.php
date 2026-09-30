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

    /**
     * The properties the CURRENT user has been granted kitchen access to
     * (as opposed to index(), which lists staff for a property its OWNER
     * is looking at) — lets a Kitchen Staff login land on their restaurant
     * directly instead of a "My Hotels" list they have nothing in.
     */
    public function mine()
    {
        $staff = RestaurantStaff::where('user_id', auth()->id())->with('owner')->get();

        return response()->json($staff->map(fn ($s) => [
            'id' => $s->id,
            'owner_type' => $s->owner instanceof \App\Models\Activity ? 'activity' : 'hotel',
            'owner_id' => $s->owner_id,
            'owner_name' => $s->owner?->name,
        ]));
    }

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
