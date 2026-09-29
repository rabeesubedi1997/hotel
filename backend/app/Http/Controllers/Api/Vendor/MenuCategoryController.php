<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Hotel;
use App\Models\MenuCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuCategoryController extends Controller
{
    private function blockIfUnapproved($user, Hotel $hotel): ?JsonResponse
    {
        if ($user->isAdminLevel() || $hotel->approval_status === Hotel::APPROVAL_STATUS_APPROVED) {
            return null;
        }

        return response()->json([
            'message' => 'This hotel must be verified by an admin before you can manage categories.',
        ], 403);
    }

    private function resolveHotel($user, $hotelId): Hotel
    {
        if ($user->isAdminLevel()) {
            return Hotel::findOrFail($hotelId);
        }

        return Hotel::where('user_id', $user->id)->findOrFail($hotelId);
    }

    public function index($hotelId)
    {
        $user = auth()->user();
        $hotel = $this->resolveHotel($user, $hotelId);

        return response()->json($hotel->menuCategories()->orderBy('sort_order')->orderBy('name')->get());
    }

    public function store(Request $request, $hotelId)
    {
        $user = auth()->user();
        $hotel = $this->resolveHotel($user, $hotelId);

        if ($blocked = $this->blockIfUnapproved($user, $hotel)) {
            return $blocked;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:menu_categories,name,NULL,id,hotel_id,' . $hotel->id,
        ]);

        $maxOrder = $hotel->menuCategories()->max('sort_order');

        $category = $hotel->menuCategories()->create([
            'name' => $validated['name'],
            'sort_order' => ($maxOrder ?? -1) + 1,
        ]);

        return response()->json(['message' => 'Category created', 'category' => $category], 201);
    }

    public function update(Request $request, $categoryId)
    {
        $user = auth()->user();
        $category = MenuCategory::findOrFail($categoryId);
        $hotel = $category->hotel;

        if (!$user->isAdminLevel() && $hotel->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ($blocked = $this->blockIfUnapproved($user, $hotel)) {
            return $blocked;
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255|unique:menu_categories,name,' . $category->id . ',id,hotel_id,' . $hotel->id,
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $oldName = $category->name;
        $category->update($validated);

        // Renaming a category should cascade to every menu item tagged with
        // the old free-text category value, so items don't silently orphan
        // from the category list.
        if (isset($validated['name']) && $validated['name'] !== $oldName) {
            $hotel->menuItems()->where('category', $oldName)->update(['category' => $validated['name']]);
        }

        return response()->json(['message' => 'Category updated', 'category' => $category]);
    }

    public function destroy(Request $request, $categoryId)
    {
        $user = auth()->user();
        $category = MenuCategory::findOrFail($categoryId);
        $hotel = $category->hotel;

        if (!$user->isAdminLevel() && $hotel->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ($blocked = $this->blockIfUnapproved($user, $hotel)) {
            return $blocked;
        }

        $itemCount = $hotel->menuItems()->where('category', $category->name)->count();
        if ($itemCount > 0) {
            return response()->json([
                'message' => "Cannot delete \"{$category->name}\" — {$itemCount} menu item(s) still use it. Reassign them first.",
            ], 422);
        }

        $category->delete();

        return response()->json(['message' => 'Category deleted']);
    }

    public function reorder(Request $request, $hotelId)
    {
        $user = auth()->user();
        $hotel = $this->resolveHotel($user, $hotelId);

        if ($blocked = $this->blockIfUnapproved($user, $hotel)) {
            return $blocked;
        }

        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:menu_categories,id',
        ]);

        foreach ($validated['ids'] as $index => $id) {
            $hotel->menuCategories()->where('id', $id)->update(['sort_order' => $index]);
        }

        return response()->json(['message' => 'Categories reordered']);
    }
}
