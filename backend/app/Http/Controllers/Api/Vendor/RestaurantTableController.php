<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Hotel;
use App\Models\RestaurantTable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RestaurantTableController extends Controller
{
    private function blockIfUnapproved($user, Hotel $hotel): ?JsonResponse
    {
        if ($user->isAdminLevel() || $hotel->approval_status === Hotel::APPROVAL_STATUS_APPROVED) {
            return null;
        }

        return response()->json([
            'message' => 'This hotel must be verified by an admin before you can manage its tables.',
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

        $tables = $hotel->restaurantTables()->orderBy('table_number')->get();

        return response()->json($tables);
    }

    public function store(Request $request, $hotelId)
    {
        $user = auth()->user();
        $hotel = $this->resolveHotel($user, $hotelId);

        if ($blocked = $this->blockIfUnapproved($user, $hotel)) {
            return $blocked;
        }

        $validated = $request->validate([
            'table_number' => 'required|string|max:255',
            'capacity' => 'required|integer|min:1',
            'status' => 'sometimes|in:available,occupied,reserved',
        ]);

        $validated['hotel_id'] = $hotel->id;

        $table = RestaurantTable::create($validated);

        return response()->json([
            'message' => 'Table created successfully',
            'table' => $table,
        ], 201);
    }

    public function update(Request $request, $tableId)
    {
        $user = auth()->user();
        $table = RestaurantTable::findOrFail($tableId);
        $hotel = $table->hotel;

        if (!$user->isAdminLevel() && $hotel->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ($blocked = $this->blockIfUnapproved($user, $hotel)) {
            return $blocked;
        }

        $validated = $request->validate([
            'table_number' => 'sometimes|string|max:255',
            'capacity' => 'sometimes|integer|min:1',
            'status' => 'sometimes|in:available,occupied,reserved',
        ]);

        $table->update($validated);

        return response()->json([
            'message' => 'Table updated successfully',
            'table' => $table,
        ]);
    }

    public function destroy($tableId)
    {
        $user = auth()->user();
        $table = RestaurantTable::findOrFail($tableId);
        $hotel = $table->hotel;

        if (!$user->isAdminLevel() && $hotel->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ($blocked = $this->blockIfUnapproved($user, $hotel)) {
            return $blocked;
        }

        $table->delete();

        return response()->json(['message' => 'Table deleted successfully']);
    }
}
