<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Vendor\Concerns\ResolvesRestaurantOwner;
use App\Models\Order;
use Illuminate\Http\Request;

class InventorySettingsController extends Controller
{
    use ResolvesRestaurantOwner;

    public function update(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        if ($blocked = $this->blockIfOwnerUnapproved($user, $owner, 'change inventory settings')) {
            return $blocked;
        }

        $validated = $request->validate([
            'stock_deduction_mode' => 'required|in:' . Order::STOCK_DEDUCTION_ON_ORDER . ',' . Order::STOCK_DEDUCTION_ON_COMPLETE,
        ]);

        $owner->update($validated);

        return response()->json([
            'message' => 'Inventory settings updated',
            'stock_deduction_mode' => $owner->stock_deduction_mode,
        ]);
    }
}
