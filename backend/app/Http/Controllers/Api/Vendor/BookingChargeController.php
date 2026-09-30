<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\BookingCharge;
use App\Models\Hotel;
use Illuminate\Http\Request;

class BookingChargeController extends Controller
{
    /**
     * Void a posted/pending charge before the guest checks out — e.g. a
     * restaurant order that was mistakenly attached to the wrong room.
     * Authorization mirrors OrderController::authorizeOwnerOfRecord: the
     * booking's bookable (Hotel or Activity) must belong to this vendor.
     */
    public function void(Request $request, BookingCharge $bookingCharge)
    {
        $user = auth()->user();
        $owner = $bookingCharge->booking->bookable;

        if (!$user->isAdminLevel() && (!$owner || $owner->user_id !== $user->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $requiredPermission = ($owner instanceof Activity ? 'activities' : 'hotels') . '.edit.own';
        if (!$user->isAdminLevel() && !$user->hasPermission($requiredPermission)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $bookingCharge->update([
            'status' => BookingCharge::STATUS_VOIDED,
            'voided_at' => now(),
        ]);

        return response()->json([
            'message' => 'Charge voided',
            'charge' => $bookingCharge->fresh(),
        ]);
    }
}
