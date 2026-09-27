<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Resolves who should be instantly notified about a booking request: the
 * vendor who owns the listing (if any) plus every admin-level user, so a
 * request never goes unseen just because one person is offline.
 */
class BookingAlertService
{
    public function recipientsFor(?User $owner): Collection
    {
        $admins = User::whereIn('role', [User::ROLE_ADMIN, User::ROLE_MANAGER, User::ROLE_SUPER_ADMIN])
            ->where('status', User::STATUS_ACTIVE)
            ->get();

        if ($owner && $owner->status === User::STATUS_ACTIVE) {
            return $admins->push($owner)->unique('id');
        }

        return $admins;
    }
}
