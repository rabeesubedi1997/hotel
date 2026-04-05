<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

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
            'password' => 'required|string|min:8',
            'phone' => 'nullable|string|max:20',
            'role' => 'required|in:admin,manager,customer',
            'status' => 'in:active,inactive,suspended',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
        ]);

        $validated['password'] = Hash::make($validated['password']);

        $user = User::create($validated);

        return response()->json([
            'user' => $user,
            'message' => 'User created successfully.',
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        $user->load(['bookings', 'reviews']);

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

        $user->update($validated);

        return response()->json([
            'user' => $user,
            'message' => 'User updated successfully.',
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
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

        $user->update(['role' => $request->role]);

        return response()->json([
            'user' => $user,
            'message' => 'User role updated successfully.',
        ]);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:active,inactive,suspended',
        ]);

        $user->update(['status' => $request->status]);

        return response()->json([
            'user' => $user,
            'message' => 'User status updated successfully.',
        ]);
    }
}
