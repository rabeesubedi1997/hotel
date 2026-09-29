<?php

namespace App\Http\Controllers\Api\Vendor\Concerns;

use App\Models\Activity;
use App\Models\Hotel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Restaurant POS (menu/categories/tables/orders/reports) is owned by either
 * a Hotel or an Activity — same tables, same columns, an `owner_type` string
 * that says which relation to use. Routes carry a static `ownerType` route
 * default so one controller method serves both `/hotels/{hotel}/...` and
 * `/activities/{activity}/...` without duplicating the CRUD logic.
 */
trait ResolvesRestaurantOwner
{
    private function ownerTypeFromRequest(Request $request): string
    {
        $type = $request->route('ownerType');

        return $type === 'activity' ? 'activity' : 'hotel';
    }

    private function resolveOwner($user, string $ownerType, $ownerId): Hotel|Activity
    {
        $modelClass = $ownerType === 'activity' ? Activity::class : Hotel::class;

        if ($user->isAdminLevel()) {
            return $modelClass::findOrFail($ownerId);
        }

        return $modelClass::where('user_id', $user->id)->findOrFail($ownerId);
    }

    private function ownerFromRecord($record): Hotel|Activity
    {
        return $record->owner;
    }

    private function ownerLabel($owner): string
    {
        return $owner instanceof Activity ? 'activity' : 'hotel';
    }

    private function blockIfOwnerUnapproved($user, $owner, string $action = 'manage its restaurant POS'): ?JsonResponse
    {
        if ($user->isAdminLevel() || $owner->approval_status === 'approved') {
            return null;
        }

        return response()->json([
            'message' => 'This ' . $this->ownerLabel($owner) . " must be verified by an admin before you can {$action}.",
        ], 403);
    }

    /**
     * Confirms the user owns the record's actual owner (Hotel or Activity)
     * AND still holds the permission for that specific owner type —
     * route-level middleware only checks "hotels.X.own OR activities.X.own"
     * since it can't see which type a given record is, so this is where
     * the real per-type check has to live.
     */
    private function authorizeOwnerOfRecord($user, $record, string $permissionAction = 'edit'): ?JsonResponse
    {
        $owner = $this->ownerFromRecord($record);

        if (!$user->isAdminLevel() && $owner->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $requiredPermission = ($owner instanceof Activity ? 'activities' : 'hotels') . ".{$permissionAction}.own";
        if (!$user->isAdminLevel() && !$user->hasPermission($requiredPermission)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return null;
    }
}
