<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    /**
     * Handle an incoming request.
     *
     * $permission may be a single slug ("hotels.edit.own") or a pipe-separated
     * list ("hotels.edit.own|activities.edit.own") — used where a route
     * covers a record that could be owned by either a hotel or an activity
     * (e.g. Restaurant POS routes shared between the two), so the caller
     * only needs ONE of the listed permissions.
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized. Authentication required.'], 401);
        }

        // Admin-level users bypass per-permission checks entirely. This is
        // what actually lets them operate inside a vendor's Management
        // System: vendor routes are gated on ".own"-suffixed permissions
        // (hotels.edit.own, etc.) that admin/manager/super_admin roles
        // never have — they use ".all"/".assigned" instead — so without
        // this bypass an admin "acting as" a vendor (see ActsForVendor)
        // would be 403'd on every vendor route despite VendorMiddleware
        // already having let them through.
        if ($user->isAdminLevel()) {
            return $next($request);
        }

        if (!$user->hasAnyPermission(explode('|', $permission))) {
            return response()->json([
                'message' => 'Forbidden. Insufficient permissions.',
                'required_permission' => $permission,
                'user_permissions' => $user->getAllPermissions()
            ], 403);
        }

        return $next($request);
    }
}
