<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Hotel;
use App\Models\MenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    private function blockIfUnapproved($user, Hotel $hotel): ?JsonResponse
    {
        if ($user->isAdminLevel() || $hotel->approval_status === Hotel::APPROVAL_STATUS_APPROVED) {
            return null;
        }

        return response()->json([
            'message' => 'This hotel must be verified by an admin before you can manage its menu.',
        ], 403);
    }

    private function resolveHotel($user, $hotelId): Hotel
    {
        if ($user->isAdminLevel()) {
            return Hotel::findOrFail($hotelId);
        }

        return Hotel::where('user_id', $user->id)->findOrFail($hotelId);
    }

    public function index($hotelId)
    {
        $user = auth()->user();
        $hotel = $this->resolveHotel($user, $hotelId);

        $items = $hotel->menuItems()->orderBy('category')->orderBy('name')->get();

        return response()->json($items);
    }

    public function store(Request $request, $hotelId)
    {
        $user = auth()->user();
        $hotel = $this->resolveHotel($user, $hotelId);

        if ($blocked = $this->blockIfUnapproved($user, $hotel)) {
            return $blocked;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'category' => 'required|string|max:255',
            'image' => 'nullable|string',
            'is_available' => 'sometimes|boolean',
            'stock_quantity' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'sometimes|integer|min:0',
        ]);

        $validated['hotel_id'] = $hotel->id;

        $item = MenuItem::create($validated);

        return response()->json([
            'message' => 'Menu item created successfully',
            'item' => $item,
        ], 201);
    }

    public function update(Request $request, $itemId)
    {
        $user = auth()->user();
        $item = MenuItem::findOrFail($itemId);
        $hotel = $item->hotel;

        if (!$user->isAdminLevel() && $hotel->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ($blocked = $this->blockIfUnapproved($user, $hotel)) {
            return $blocked;
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'price' => 'sometimes|numeric|min:0',
            'category' => 'sometimes|string|max:255',
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

    public function destroy($itemId)
    {
        $user = auth()->user();
        $item = MenuItem::findOrFail($itemId);
        $hotel = $item->hotel;

        if (!$user->isAdminLevel() && $hotel->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ($blocked = $this->blockIfUnapproved($user, $hotel)) {
            return $blocked;
        }

        $item->delete();

        return response()->json(['message' => 'Menu item deleted successfully']);
    }
}
