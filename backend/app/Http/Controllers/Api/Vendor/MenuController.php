<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Vendor\Concerns\ResolvesRestaurantOwner;
use App\Models\MenuItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class MenuController extends Controller
{
    use ResolvesRestaurantOwner;

    public function index(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        $items = $owner->menuItems()->orderBy('category')->orderBy('name')->get();

        return response()->json($items);
    }

    public function store(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        if ($blocked = $this->blockIfOwnerUnapproved($user, $owner, 'manage its menu')) {
            return $blocked;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'category' => 'required|string|max:255',
            'sku' => 'nullable|string|max:100',
            'station' => 'nullable|string|max:100',
            'allergens' => 'nullable|array',
            'allergens.*' => 'string|max:50',
            'prep_time_minutes' => 'nullable|integer|min:0',
            'image' => 'nullable|string',
            'is_available' => 'sometimes|boolean',
            'stock_quantity' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'sometimes|integer|min:0',
        ]);

        $item = $owner->menuItems()->create($validated);

        return response()->json([
            'message' => 'Menu item created successfully',
            'item' => $item,
        ], 201);
    }

    /**
     * Bulk-create/update menu items (and their stock) from an uploaded CSV —
     * the "Import" counterpart to the client-side "Export CSV" button.
     * A row whose SKU matches an existing item for this owner updates that
     * item (price/stock/etc.) instead of creating a duplicate, so the same
     * template can be used both to add new items and to restock existing
     * ones in bulk.
     */
    public function import(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        if ($blocked = $this->blockIfOwnerUnapproved($user, $owner, 'manage its menu')) {
            return $blocked;
        }

        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:2048',
        ]);

        $handle = fopen($request->file('file')->getRealPath(), 'r');
        $header = fgetcsv($handle);
        if (!$header) {
            fclose($handle);
            return response()->json(['message' => 'The file is empty.'], 422);
        }
        $header = array_map(fn ($h) => strtolower(trim((string) $h)), $header);

        $created = 0;
        $updated = 0;
        $errors = [];
        $rowNumber = 1; // header is row 1

        DB::transaction(function () use ($handle, $header, $owner, &$created, &$updated, &$errors, &$rowNumber) {
            while (($row = fgetcsv($handle)) !== false) {
                $rowNumber++;

                if (count(array_filter($row, fn ($v) => trim((string) $v) !== '')) === 0) {
                    continue; // skip blank rows
                }

                $data = array_combine($header, array_pad(array_slice($row, 0, count($header)), count($header), null));

                $sku = trim((string) ($data['sku'] ?? ''));
                $allergens = trim((string) ($data['allergens'] ?? ''));
                $available = strtolower(trim((string) ($data['available'] ?? 'yes')));

                $payload = [
                    'name' => trim((string) ($data['name'] ?? '')),
                    'category' => trim((string) ($data['category'] ?? '')),
                    'sku' => $sku !== '' ? $sku : null,
                    'price' => trim((string) ($data['price'] ?? '')),
                    'cost_price' => trim((string) ($data['cost_price'] ?? '')) !== '' ? $data['cost_price'] : null,
                    'stock_quantity' => trim((string) ($data['stock_quantity'] ?? '')) !== '' ? $data['stock_quantity'] : null,
                    'low_stock_threshold' => trim((string) ($data['low_stock_threshold'] ?? '')) !== '' ? $data['low_stock_threshold'] : 5,
                    'station' => trim((string) ($data['station'] ?? '')) ?: null,
                    'description' => trim((string) ($data['description'] ?? '')) ?: null,
                    'allergens' => $allergens !== '' ? array_values(array_filter(array_map('trim', explode(';', $allergens)))) : [],
                    'is_available' => in_array($available, ['yes', 'y', 'true', '1'], true),
                ];

                $validator = Validator::make($payload, [
                    'name' => 'required|string|max:255',
                    'category' => 'required|string|max:255',
                    'sku' => 'nullable|string|max:100',
                    'price' => 'required|numeric|min:0',
                    'cost_price' => 'nullable|numeric|min:0',
                    'stock_quantity' => 'nullable|integer|min:0',
                    'low_stock_threshold' => 'nullable|integer|min:0',
                    'station' => 'nullable|string|max:100',
                    'description' => 'nullable|string',
                    'allergens.*' => 'string|max:50',
                    'is_available' => 'boolean',
                ]);

                if ($validator->fails()) {
                    $errors[] = ['row' => $rowNumber, 'errors' => $validator->errors()->all()];
                    continue;
                }

                $validated = $validator->validated();

                $existing = $validated['sku'] ? $owner->menuItems()->where('sku', $validated['sku'])->first() : null;
                if ($existing) {
                    $existing->update($validated);
                    $updated++;
                } else {
                    $owner->menuItems()->create($validated);
                    $created++;
                }
            }
        });

        fclose($handle);

        $summary = "{$created} item(s) created, {$updated} updated";
        if (count($errors) > 0) {
            $summary .= ', ' . count($errors) . ' row(s) skipped';
        }

        return response()->json([
            'message' => $summary,
            'created' => $created,
            'updated' => $updated,
            'errors' => $errors,
            'items' => $owner->menuItems()->orderBy('category')->orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, $itemId)
    {
        $user = auth()->user();
        $item = MenuItem::findOrFail($itemId);

        if ($blocked = $this->authorizeOwnerOfRecord($user, $item, 'edit')) {
            return $blocked;
        }
        if ($blocked = $this->blockIfOwnerUnapproved($user, $this->ownerFromRecord($item), 'manage its menu')) {
            return $blocked;
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'price' => 'sometimes|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'category' => 'sometimes|string|max:255',
            'sku' => 'nullable|string|max:100',
            'station' => 'nullable|string|max:100',
            'allergens' => 'nullable|array',
            'allergens.*' => 'string|max:50',
            'prep_time_minutes' => 'nullable|integer|min:0',
            'image' => 'sometimes|string',
            'is_available' => 'sometimes|boolean',
            'stock_quantity' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'sometimes|integer|min:0',
        ]);

        $item->update($validated);

        return response()->json([
            'message' => 'Menu item updated successfully',
            'item' => $item,
        ]);
    }

    public function bulkAvailability(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        if ($blocked = $this->blockIfOwnerUnapproved($user, $owner, 'manage its menu')) {
            return $blocked;
        }

        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:menu_items,id',
            'is_available' => 'required|boolean',
        ]);

        $items = $owner->menuItems()->whereIn('id', $validated['ids']);
        $count = $items->count();
        $items->update(['is_available' => $validated['is_available']]);

        return response()->json([
            'message' => $validated['is_available']
                ? "{$count} item(s) restored"
                : "{$count} item(s) 86'd",
            'items' => $owner->menuItems()->whereIn('id', $validated['ids'])->get(),
        ]);
    }

    public function destroy($itemId)
    {
        $user = auth()->user();
        $item = MenuItem::findOrFail($itemId);

        if ($blocked = $this->authorizeOwnerOfRecord($user, $item, 'delete')) {
            return $blocked;
        }
        if ($blocked = $this->blockIfOwnerUnapproved($user, $this->ownerFromRecord($item), 'manage its menu')) {
            return $blocked;
        }

        $item->delete();

        return response()->json(['message' => 'Menu item deleted successfully']);
    }
}
