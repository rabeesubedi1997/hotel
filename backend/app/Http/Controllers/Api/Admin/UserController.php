<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'nullable|string|min:8',
            'phone' => 'nullable|string|max:20',
            'role' => 'required|in:admin,manager,customer,vendor',
            'status' => 'in:active,inactive,suspended',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
        ]);

        // Generate password if not provided
        $password = $validated['password'] ?? Str::upper(Str::random(8));
        $validated['password'] = Hash::make($password);

        $user = User::create($validated);

        return response()->json([
            'user' => $user,
            'password' => $password, // Return plain password for admin to share
            'message' => 'User created successfully.',
        ], 201);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        $user->loadCount(['bookings', 'reviews', 'wishlists', 'tripPlans']);
        $user->load([
            'bookings' => function ($q) {
                $q->with('bookable')->latest()->limit(10);
            },
            'reviews' => function ($q) {
                $q->with('reviewable')->latest()->limit(10);
            },
            'wishlists' => function ($q) {
                $q->with('wishlistable')->latest()->limit(10);
            },
            'tripPlans' => function ($q) {
                $q->withCount('items')->latest()->limit(10);
            },
        ]);

        // Superadmin/admin oversight into a specific user's data — this is
        // the "view" half of the view+edit-as-superadmin feature.
        AdminAuditLog::record($request->user(), 'view', 'User', $user->id, $user->id);

        return response()->json($user);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'password' => 'sometimes|string|min:8',
            'phone' => 'nullable|string|max:20',
            'role' => 'sometimes|in:admin,manager,customer',
            'status' => 'in:active,inactive,suspended',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $before = $user->only(array_keys($validated));
        $user->update($validated);

        AdminAuditLog::record(
            $request->user(),
            'update',
            'User',
            $user->id,
            $user->id,
            $before,
            $user->only(array_keys($validated))
        );

        return response()->json([
            'user' => $user,
            'message' => 'User updated successfully.',
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        AdminAuditLog::record($request->user(), 'delete', 'User', $user->id, $user->id);

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully.',
        ]);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'role' => 'required|in:admin,manager,customer',
        ]);

        $before = ['role' => $user->role];
        $user->update(['role' => $request->role]);

        AdminAuditLog::record($request->user(), 'update_role', 'User', $user->id, $user->id, $before, ['role' => $user->role]);

        return response()->json([
            'user' => $user,
            'message' => 'User role updated successfully.',
        ]);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:active,inactive,suspended'
        ]);

        $before = ['status' => $user->status];
        $user->update(['status' => $validated['status']]);

        AdminAuditLog::record($request->user(), 'status_change', 'User', $user->id, $user->id, $before, ['status' => $user->status]);

        return response()->json([
            'message' => 'User status updated successfully',
            'user' => $user
        ]);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        // Generate new random password
        $newPassword = Str::upper(Str::random(8));

        $user->update([
            'password' => Hash::make($newPassword)
        ]);

        // Deliberately don't record the password itself in the audit log.
        AdminAuditLog::record($request->user(), 'reset_password', 'User', $user->id, $user->id);

        return response()->json([
            'message' => 'Password reset successfully',
            'password' => $newPassword
        ]);
    }
}
