<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\Room;
use App\Models\Hotel;

class RoomController extends Controller
{
    public function index($hotelId)
    {
        $user = auth()->user();
        
        // Admin users can access all hotels
        if ($user->isAdminLevel()) {
            $hotel = Hotel::findOrFail($hotelId);
        } else {
            // Vendors can only access their own hotels
            $hotel = Hotel::where('user_id', $user->id)
                ->findOrFail($hotelId);
        }
            
        $rooms = $hotel->rooms()
            ->orderBy('id', 'desc')
            ->get();
            
        return response()->json($rooms);
    }

    public function store(Request $request, $hotelId)
    {
        $user = auth()->user();
        
        // Admin users can access all hotels
        if ($user->isAdminLevel()) {
            $hotel = Hotel::findOrFail($hotelId);
        } else {
            // Vendors can only access their own hotels
            $hotel = Hotel::where('user_id', $user->id)
                ->findOrFail($hotelId);
        }

        $validated = $request->validate([
            'room_type' => 'required|string|max:255',
            'room_number' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'capacity' => 'required|integer|min:1',
            'available_count' => 'required|integer|min:0',
            'bed_count' => 'nullable|integer|min:1',
            'bed_type' => 'required|string|max:255',
            'amenities' => 'nullable|array',
            'status' => 'required|in:available,occupied,maintenance,cleaning',
        ]);

        $validated['hotel_id'] = $hotelId;
        $validated['user_id'] = $user->id;

        $room = Room::create($validated);

        return response()->json([
            'message' => 'Room created successfully',
            'room' => $room
        ], 201);
    }

    public function update(Request $request, $roomId)
    {
        $user = auth()->user();
        $room = Room::findOrFail($roomId);
        $hotel = $room->hotel;

        // Ensure user can only update their own rooms (admin can access all)
        if (!$user->isAdminLevel() && $hotel->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'room_type' => 'sometimes|string|max:255',
            'room_number' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'price' => 'sometimes|numeric|min:0',
            'capacity' => 'sometimes|integer|min:1',
            'available_count' => 'sometimes|integer|min:0',
            'bed_count' => 'sometimes|integer|min:1',
            'bed_type' => 'sometimes|string|max:255',
            'amenities' => 'sometimes|array',
            'status' => 'sometimes|in:available,occupied,maintenance,cleaning',
        ]);

        $room->update($validated);

        return response()->json([
            'message' => 'Room updated successfully',
            'room' => $room
        ]);
    }

    public function destroy($roomId)
    {
        $user = auth()->user();
        $room = Room::findOrFail($roomId);
        $hotel = $room->hotel;

        // Ensure user can only delete their own rooms (admin can access all)
        if (!$user->isAdminLevel() && $hotel->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $room->delete();

        return response()->json([
            'message' => 'Room deleted successfully'
        ]);
    }
}
