<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VendorMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }
        
        // Allow vendors to access admin panel with their data filtered, and
        // admin-level users to manage a vendor's panel on their behalf
        // (see ActsForVendor). Also let a Kitchen Staff login through —
        // it's a separate account (primary role stays whatever it was,
        // e.g. customer) that only holds the standalone restaurant.kitchen.*
        // permissions, scoped to one property via RestaurantStaff; every
        // route inside still gates on that permission or on ownership.
        $isKitchenStaff = $request->user()->hasAnyPermission(['restaurant.kitchen.view', 'restaurant.kitchen.manage']);
        if (!$request->user()->isAdminLevel() && !$request->user()->isVendor() && !$isKitchenStaff) {
            return response()->json(['message' => 'Forbidden. Vendor or admin access required.'], 403);
        }
        
        return $next($request);
    }
}
