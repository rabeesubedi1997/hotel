<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Vendor\Concerns\ResolvesRestaurantOwner;
use App\Models\Booking;
use Illuminate\Http\Request;

/**
 * Powers "Charge to Room" on a Restaurant POS order — finds bookings for
 * this hotel/activity that are still on-property (checked_in/confirmed,
 * not yet checked out) so front-of-house staff can attach an order to the
 * right guest's folio instead of taking a separate payment at the table.
 */
class ActiveBookingLookupController extends Controller
{
    use ResolvesRestaurantOwner;

    public function index(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        $query = Booking::where('bookable_type', get_class($owner))
            ->where('bookable_id', $owner->id)
            ->whereIn('status', [Booking::STATUS_CONFIRMED, Booking::STATUS_CHECKED_IN])
            ->where(function ($q) {
                $q->whereNull('check_out_date')->orWhereDate('check_out_date', '>=', now()->toDateString());
            })
            ->with(['user:id,name,email', 'room:id,room_number']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', fn ($u) => $u->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('room', fn ($r) => $r->where('room_number', 'like', "%{$search}%"))
                    ->orWhere('booking_number', 'like', "%{$search}%");
            });
        }

        return response()->json(
            $query->orderBy('check_in_date')->limit(25)->get()
        );
    }
}
