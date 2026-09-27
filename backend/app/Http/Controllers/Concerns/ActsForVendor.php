<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;

/**
 * Every Vendor\* controller scopes its queries to "the current vendor" —
 * normally that's just the authenticated user. But an admin-level user
 * "managing" a specific vendor's panel (the frontend's vendor picker,
 * after choosing the Management System) sends an X-Acting-Vendor-Id
 * header instead of operating on their own account, so these controllers
 * need to scope to that vendor's id in that case. Only admin-level users
 * can use this header — a plain vendor sending it is ignored and always
 * scoped to themselves, so one vendor can never reach another's data.
 */
trait ActsForVendor
{
    protected function vendorId(Request $request): int
    {
        $user = $request->user();
        $actingAs = $request->header('X-Acting-Vendor-Id');

        if ($actingAs && $user->isAdminLevel()) {
            return (int) $actingAs;
        }

        return $user->id;
    }
}
