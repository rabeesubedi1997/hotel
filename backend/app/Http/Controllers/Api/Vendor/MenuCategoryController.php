<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Vendor\Concerns\ResolvesRestaurantOwner;
use App\Models\MenuCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MenuCategoryController extends Controller
{
    use ResolvesRestaurantOwner;

    public function index(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        return response()->json($owner->menuCategories()->orderBy('sort_order')->orderBy('name')->get());
    }

    public function store(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        if ($blocked = $this->blockIfOwnerUnapproved($user, $owner, 'manage categories')) {
            return $blocked;
        }

        $validated = $request->validate([
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('menu_categories', 'name')->where(
                    fn ($query) => $query->where('owner_type', $owner->getMorphClass())->where('owner_id', $owner->id)
                ),
            ],
        ]);

        $maxOrder = $owner->menuCategories()->max('sort_order');

        $category = $owner->menuCategories()->create([
            'name' => $validated['name'],
            'sort_order' => ($maxOrder ?? -1) + 1,
        ]);

        return response()->json(['message' => 'Category created', 'category' => $category], 201);
    }

    public function update(Request $request, $categoryId)
    {
        $user = auth()->user();
        $category = MenuCategory::findOrFail($categoryId);
        $owner = $this->ownerFromRecord($category);

        if ($blocked = $this->authorizeOwnerOfRecord($user, $category, 'edit')) {
            return $blocked;
        }
        if ($blocked = $this->blockIfOwnerUnapproved($user, $owner, 'manage categories')) {
            return $blocked;
        }

        $validated = $request->validate([
            'name' => [
                'sometimes', 'string', 'max:255',
                Rule::unique('menu_categories', 'name')->where(
                    fn ($query) => $query->where('owner_type', $owner->getMorphClass())->where('owner_id', $owner->id)
                )->ignore($category->id),
            ],
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $oldName = $category->name;
        $category->update($validated);

        // Renaming a category should cascade to every menu item tagged with
        // the old free-text category value, so items don't silently orphan
        // from the category list.
        if (isset($validated['name']) && $validated['name'] !== $oldName) {
            $owner->menuItems()->where('category', $oldName)->update(['category' => $validated['name']]);
        }

        return response()->json(['message' => 'Category updated', 'category' => $category]);
    }

    public function destroy($categoryId)
    {
        $user = auth()->user();
        $category = MenuCategory::findOrFail($categoryId);
        $owner = $this->ownerFromRecord($category);

        if ($blocked = $this->authorizeOwnerOfRecord($user, $category, 'delete')) {
            return $blocked;
        }
        if ($blocked = $this->blockIfOwnerUnapproved($user, $owner, 'manage categories')) {
            return $blocked;
        }

        $itemCount = $owner->menuItems()->where('category', $category->name)->count();
        if ($itemCount > 0) {
            return response()->json([
                'message' => "Cannot delete \"{$category->name}\" — {$itemCount} menu item(s) still use it. Reassign them first.",
            ], 422);
        }

        $category->delete();

        return response()->json(['message' => 'Category deleted']);
    }

    public function reorder(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        if ($blocked = $this->blockIfOwnerUnapproved($user, $owner, 'manage categories')) {
            return $blocked;
        }

        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:menu_categories,id',
        ]);

        foreach ($validated['ids'] as $index => $id) {
            $owner->menuCategories()->where('id', $id)->update(['sort_order' => $index]);
        }

        return response()->json(['message' => 'Categories reordered']);
    }
}
