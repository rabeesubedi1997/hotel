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
