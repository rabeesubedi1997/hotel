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
        
        // Allow vendors to access admin panel with their data filtered
        if (!$request->user()->isVendor() && !$request->user()->isAdmin() && !$request->user()->isManager()) {
            return response()->json(['message' => 'Forbidden. Vendor, admin, or manager access required.'], 403);
        }
        
        return $next($request);
    }
}
