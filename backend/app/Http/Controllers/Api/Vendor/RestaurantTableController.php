<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Vendor\Concerns\ResolvesRestaurantOwner;
use App\Models\RestaurantTable;
use Illuminate\Http\Request;

class RestaurantTableController extends Controller
{
    use ResolvesRestaurantOwner;

    public function index(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        $tables = $owner->restaurantTables()->orderBy('table_number')->get();

        return response()->json($tables);
    }

    public function store(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        if ($blocked = $this->blockIfOwnerUnapproved($user, $owner, 'manage its tables')) {
            return $blocked;
        }

        $validated = $request->validate([
            'table_number' => 'required|string|max:255',
            'capacity' => 'required|integer|min:1',
            'status' => 'sometimes|in:available,occupied,reserved',
        ]);

        $validated[$this->ownerColumn($owner)] = $owner->id;

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

        if ($blocked = $this->authorizeOwnerOfRecord($user, $table)) {
            return $blocked;
        }
        if ($blocked = $this->blockIfOwnerUnapproved($user, $this->ownerFromRecord($table), 'manage its tables')) {
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

        if ($blocked = $this->authorizeOwnerOfRecord($user, $table)) {
            return $blocked;
        }
        if ($blocked = $this->blockIfOwnerUnapproved($user, $this->ownerFromRecord($table), 'manage its tables')) {
            return $blocked;
        }

        $table->delete();

        return response()->json(['message' => 'Table deleted successfully']);
    }
}
