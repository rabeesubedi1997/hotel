<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Vendor\Concerns\ResolvesRestaurantOwner;
use App\Models\MenuItem;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    use ResolvesRestaurantOwner;

    public function index(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        $items = $owner->menuItems()->orderBy('category')->orderBy('name')->get();

        return response()->json($items);
    }

    public function store(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        if ($blocked = $this->blockIfOwnerUnapproved($user, $owner, 'manage its menu')) {
            return $blocked;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'category' => 'required|string|max:255',
            'sku' => 'nullable|string|max:100',
            'station' => 'nullable|string|max:100',
            'allergens' => 'nullable|array',
            'allergens.*' => 'string|max:50',
            'prep_time_minutes' => 'nullable|integer|min:0',
            'image' => 'nullable|string',
            'is_available' => 'sometimes|boolean',
            'stock_quantity' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'sometimes|integer|min:0',
        ]);

        $item = $owner->menuItems()->create($validated);

        return response()->json([
            'message' => 'Menu item created successfully',
            'item' => $item,
        ], 201);
    }

    public function update(Request $request, $itemId)
    {
        $user = auth()->user();
        $item = MenuItem::findOrFail($itemId);

        if ($blocked = $this->authorizeOwnerOfRecord($user, $item, 'edit')) {
            return $blocked;
        }
        if ($blocked = $this->blockIfOwnerUnapproved($user, $this->ownerFromRecord($item), 'manage its menu')) {
            return $blocked;
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'price' => 'sometimes|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'category' => 'sometimes|string|max:255',
            'sku' => 'nullable|string|max:100',
            'station' => 'nullable|string|max:100',
            'allergens' => 'nullable|array',
            'allergens.*' => 'string|max:50',
            'prep_time_minutes' => 'nullable|integer|min:0',
            'image' => 'sometimes|string',
            'is_available' => 'sometimes|boolean',
            'stock_quantity' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'sometimes|integer|min:0',
        ]);

        $item->update($validated);

        return response()->json([
            'message' => 'Menu item updated successfully',
            'item' => $item,
        ]);
    }

    public function bulkAvailability(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        if ($blocked = $this->blockIfOwnerUnapproved($user, $owner, 'manage its menu')) {
            return $blocked;
        }

        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:menu_items,id',
            'is_available' => 'required|boolean',
        ]);

        $items = $owner->menuItems()->whereIn('id', $validated['ids']);
        $count = $items->count();
        $items->update(['is_available' => $validated['is_available']]);

        return response()->json([
            'message' => $validated['is_available']
                ? "{$count} item(s) restored"
                : "{$count} item(s) 86'd",
            'items' => $owner->menuItems()->whereIn('id', $validated['ids'])->get(),
        ]);
    }

    public function destroy($itemId)
    {
        $user = auth()->user();
        $item = MenuItem::findOrFail($itemId);

        if ($blocked = $this->authorizeOwnerOfRecord($user, $item, 'delete')) {
            return $blocked;
        }
        if ($blocked = $this->blockIfOwnerUnapproved($user, $this->ownerFromRecord($item), 'manage its menu')) {
            return $blocked;
        }

        $item->delete();

        return response()->json(['message' => 'Menu item deleted successfully']);
    }
}
