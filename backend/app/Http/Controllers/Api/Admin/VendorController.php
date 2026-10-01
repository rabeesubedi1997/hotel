<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\Paginatable;
use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class VendorController extends Controller
{
    use Paginatable;

    public function index(Request $request)
    {
        $query = User::where('role', 'vendor')
            ->withCount(['hotels', 'activities', 'tourGuides']);

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%");
            });
        }

        $vendors = $this->paginateQuery(
            $query->orderBy('created_at', 'desc'),
            $request
        );

        return response()->json($vendors);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'company_name' => 'nullable|string|max:255',
        ]);

        // Generate random password
        $password = Str::upper(Str::random(8));
        
        $vendor = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'company_name' => $validated['company_name'] ?? null,
            'password' => Hash::make($password),
            'role' => 'vendor',
            'status' => 'active',
        ]);

        return response()->json([
            'message' => 'Vendor created successfully',
            'vendor' => $vendor,
            'password' => $password, // Return password for admin to share with vendor
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $vendor = User::where('role', 'vendor')
            ->where('id', $id)
            ->withCount(['hotels', 'activities', 'tourGuides'])
            ->with(['hotels' => function($query) {
                $query->withCount(['rooms', 'bookings']);
            }, 'activities' => function($query) {
                $query->withCount('bookings');
            }, 'tourGuides' => function($query) {
                $query->withCount('bookings');
            }])
            ->firstOrFail();

        AdminAuditLog::record($request->user(), 'view', 'User', $vendor->id, $vendor->id);

        return response()->json($vendor);
    }

    public function update(Request $request, $id)
    {
        $vendor = User::where('role', 'vendor')->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'company_name' => 'nullable|string|max:255',
            // Status changes normally go through the dedicated
            // toggle-status endpoint — this profile-edit form doesn't
            // collect it, so it must stay optional here.
            'status' => 'sometimes|required|in:active,inactive,suspended',
        ]);

        $before = $vendor->only(array_keys($validated));
        $vendor->update($validated);

        AdminAuditLog::record(
            $request->user(),
            'update',
            'User',
            $vendor->id,
            $vendor->id,
            $before,
            $vendor->only(array_keys($validated))
        );

        return response()->json([
            'message' => 'Vendor updated successfully',
            'vendor' => $vendor
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $vendor = User::where('role', 'vendor')->findOrFail($id);

        AdminAuditLog::record($request->user(), 'delete', 'User', $vendor->id, $vendor->id);

        $vendor->delete();

        return response()->json(['message' => 'Vendor deleted successfully']);
    }

    public function toggleStatus(Request $request, $id)
    {
        $vendor = User::where('role', 'vendor')->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:active,inactive,suspended'
        ]);

        $before = ['status' => $vendor->status];
        $vendor->update(['status' => $validated['status']]);

        AdminAuditLog::record($request->user(), 'status_change', 'User', $vendor->id, $vendor->id, $before, ['status' => $vendor->status]);

        return response()->json([
            'message' => 'Vendor status updated successfully',
            'vendor' => $vendor
        ]);
    }

    public function resetPassword(Request $request, $id)
    {
        $vendor = User::where('role', 'vendor')->findOrFail($id);

        // Generate new random password
        $newPassword = Str::upper(Str::random(8));

        $vendor->update([
            'password' => Hash::make($newPassword)
        ]);

        AdminAuditLog::record($request->user(), 'reset_password', 'User', $vendor->id, $vendor->id);

        return response()->json([
            'message' => 'Password reset successfully',
            'password' => $newPassword
        ]);
    }
}
