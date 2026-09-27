<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Hotel;
use App\Models\Activity;
use App\Notifications\ListingApprovalDecided;
use Illuminate\Http\Request;

class ApprovalController extends Controller
{
    public function pendingHotels(Request $request)
    {
        $hotels = Hotel::pending()
            ->with(['user'])
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($hotels);
    }

    public function pendingActivities(Request $request)
    {
        $activities = Activity::pending()
            ->with(['user'])
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($activities);
    }

    public function approveHotel(Request $request, $id)
    {
        $hotel = Hotel::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
            'rejection_reason' => 'required_if:status,rejected|string|max:1000'
        ]);

        $hotel->update([
            'approval_status' => $validated['status'],
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'rejection_reason' => $validated['rejection_reason'] ?? null,
        ]);

        AdminAuditLog::record(
            $request->user(),
            'approval_decision',
            'Hotel',
            $hotel->id,
            $hotel->user_id,
            null,
            ['approval_status' => $validated['status'], 'rejection_reason' => $validated['rejection_reason'] ?? null]
        );

        $hotel->user?->notify(new ListingApprovalDecided(
            'hotel',
            $hotel->id,
            $hotel->name,
            $validated['status'],
            $validated['rejection_reason'] ?? null
        ));

        return response()->json([
            'message' => "Hotel {$validated['status']} successfully",
            'hotel' => $hotel
        ]);
    }

    public function approveActivity(Request $request, $id)
    {
        $activity = Activity::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
            'rejection_reason' => 'required_if:status,rejected|string|max:1000'
        ]);

        $activity->update([
            'approval_status' => $validated['status'],
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'rejection_reason' => $validated['rejection_reason'] ?? null,
        ]);

        AdminAuditLog::record(
            $request->user(),
            'approval_decision',
            'Activity',
            $activity->id,
            $activity->user_id,
            null,
            ['approval_status' => $validated['status'], 'rejection_reason' => $validated['rejection_reason'] ?? null]
        );

        $activity->user?->notify(new ListingApprovalDecided(
            'activity',
            $activity->id,
            $activity->name,
            $validated['status'],
            $validated['rejection_reason'] ?? null
        ));

        return response()->json([
            'message' => "Activity {$validated['status']} successfully",
            'activity' => $activity
        ]);
    }

    public function bulkApproveHotels(Request $request)
    {
        $validated = $request->validate([
            'hotel_ids' => 'required|array',
            'hotel_ids.*' => 'integer|exists:hotels,id',
            'status' => 'required|in:approved,rejected',
            'rejection_reason' => 'required_if:status,rejected|string|max:1000'
        ]);

        $hotels = Hotel::whereIn('id', $validated['hotel_ids'])->get();

        foreach ($hotels as $hotel) {
            $hotel->update([
                'approval_status' => $validated['status'],
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
                'rejection_reason' => $validated['rejection_reason'] ?? null,
            ]);

            AdminAuditLog::record(
                $request->user(),
                'approval_decision',
                'Hotel',
                $hotel->id,
                $hotel->user_id,
                null,
                ['approval_status' => $validated['status'], 'rejection_reason' => $validated['rejection_reason'] ?? null]
            );

            $hotel->user?->notify(new ListingApprovalDecided(
                'hotel',
                $hotel->id,
                $hotel->name,
                $validated['status'],
                $validated['rejection_reason'] ?? null
            ));
        }

        return response()->json([
            'message' => count($hotels) . " hotels {$validated['status']} successfully"
        ]);
    }

    public function bulkApproveActivities(Request $request)
    {
        $validated = $request->validate([
            'activity_ids' => 'required|array',
            'activity_ids.*' => 'integer|exists:activities,id',
            'status' => 'required|in:approved,rejected',
            'rejection_reason' => 'required_if:status,rejected|string|max:1000'
        ]);

        $activities = Activity::whereIn('id', $validated['activity_ids'])->get();

        foreach ($activities as $activity) {
            $activity->update([
                'approval_status' => $validated['status'],
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
                'rejection_reason' => $validated['rejection_reason'] ?? null,
            ]);

            AdminAuditLog::record(
                $request->user(),
                'approval_decision',
                'Activity',
                $activity->id,
                $activity->user_id,
                null,
                ['approval_status' => $validated['status'], 'rejection_reason' => $validated['rejection_reason'] ?? null]
            );

            $activity->user?->notify(new ListingApprovalDecided(
                'activity',
                $activity->id,
                $activity->name,
                $validated['status'],
                $validated['rejection_reason'] ?? null
            ));
        }

        return response()->json([
            'message' => count($activities) . " activities {$validated['status']} successfully"
        ]);
    }

    public function dashboard(Request $request)
    {
        $pendingHotels = Hotel::pending()->count();
        $pendingActivities = Activity::pending()->count();
        $approvedHotels = Hotel::approved()->count();
        $approvedActivities = Activity::approved()->count();
        $rejectedHotels = Hotel::rejected()->count();
        $rejectedActivities = Activity::rejected()->count();

        return response()->json([
            'pending_hotels' => $pendingHotels,
            'pending_activities' => $pendingActivities,
            'approved_hotels' => $approvedHotels,
            'approved_activities' => $approvedActivities,
            'rejected_hotels' => $rejectedHotels,
            'rejected_activities' => $rejectedActivities,
            'total_pending' => $pendingHotels + $pendingActivities,
        ]);
    }
}
