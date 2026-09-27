<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    /**
     * Handle an incoming request.
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

        if (!$user->hasPermission($permission)) {
            return response()->json([
                'message' => 'Forbidden. Insufficient permissions.',
                'required_permission' => $permission,
                'user_permissions' => $user->getAllPermissions()
            ], 403);
        }

        return $next($request);
    }
}
