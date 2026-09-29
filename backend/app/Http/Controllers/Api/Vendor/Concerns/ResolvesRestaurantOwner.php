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
        return $record->activity_id ? $record->activity : $record->hotel;
    }

    private function ownerColumn($owner): string
    {
        return $owner instanceof Activity ? 'activity_id' : 'hotel_id';
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

    private function authorizeOwnerOfRecord($user, $record): ?JsonResponse
    {
        $owner = $this->ownerFromRecord($record);

        if (!$user->isAdminLevel() && $owner->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return null;
    }
}
