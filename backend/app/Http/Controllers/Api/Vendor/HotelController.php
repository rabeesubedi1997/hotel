<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Concerns\ActsForVendor;
use App\Http\Controllers\Controller;
use App\Models\Hotel;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class HotelController extends Controller
{
    use ActsForVendor;

    public function index(Request $request)
    {
        $hotels = Hotel::where('user_id', $this->vendorId($request))
            ->withCount('rooms')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($hotels);
    }

    public function show(Request $request, $id)
    {
        $query = Hotel::withCount('rooms')->with('rooms');

        if (!$request->user()->isAdminLevel()) {
            $query->where('user_id', $this->vendorId($request));
        }

        return response()->json($query->findOrFail($id));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'address' => 'required|string',
            'city' => 'required|string',
            'district' => 'required|string',
            'price_per_night' => 'required|numeric|min:0',
        ]);

        $validated['slug'] = Str::slug($validated['name']) . '-' . time();
        $validated['user_id'] = $this->vendorId($request);
        $validated['approval_status'] = 'pending';

        $hotel = Hotel::create($validated);

        return response()->json([
            'message' => 'Hotel created successfully',
            'hotel' => $hotel
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $hotel = Hotel::where('user_id', $this->vendorId($request))->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'address' => 'required|string',
            'city' => 'required|string',
            'district' => 'required|string',
            'price_per_night' => 'required|numeric|min:0',
            'status' => 'required|in:active,inactive,maintenance',
        ]);

        $hotel->update($validated);

        return response()->json([
            'message' => 'Hotel updated successfully',
            'hotel' => $hotel
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $hotel = Hotel::where('user_id', $this->vendorId($request))->findOrFail($id);
        $hotel->delete();

        return response()->json(['message' => 'Hotel deleted successfully']);
    }
}
