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
        // (see ActsForVendor).
        if (!$request->user()->isAdminLevel() && !$request->user()->isVendor()) {
            return response()->json(['message' => 'Forbidden. Vendor or admin access required.'], 403);
        }
        
        return $next($request);
    }
}
