<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Concerns\ActsForVendor;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ActivityController extends Controller
{
    use ActsForVendor;

    public function index(Request $request)
    {
        $activities = Activity::where('user_id', $this->vendorId($request))
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($activities);
    }

    public function show(Request $request, $id)
    {
        $activity = Activity::where('user_id', $this->vendorId($request))->findOrFail($id);

        return response()->json($activity);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|string',
            'location' => 'required|string',
            'city' => 'required|string',
            'duration' => 'required|string',
            'price' => 'required|numeric|min:0',
            'max_participants' => 'required|integer|min:1',
            'difficulty_level' => 'required|in:easy,moderate,challenging,extreme',
        ]);

        $validated['slug'] = Str::slug($validated['name']) . '-' . time();
        $validated['user_id'] = $this->vendorId($request);
        $validated['approval_status'] = 'pending';

        $activity = Activity::create($validated);

        return response()->json([
            'message' => 'Activity created successfully',
            'activity' => $activity
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $activity = Activity::where('user_id', $this->vendorId($request))->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|string',
            'location' => 'required|string',
            'city' => 'required|string',
            'duration' => 'required|string',
            'price' => 'required|numeric|min:0',
            'max_participants' => 'required|integer|min:1',
            'difficulty_level' => 'required|in:easy,moderate,challenging,extreme',
            'status' => 'required|in:active,inactive,seasonal',
        ]);

        $activity->update($validated);

        return response()->json([
            'message' => 'Activity updated successfully',
            'activity' => $activity
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $activity = Activity::where('user_id', $this->vendorId($request))->findOrFail($id);
        $activity->delete();

        return response()->json(['message' => 'Activity deleted successfully']);
    }
}
