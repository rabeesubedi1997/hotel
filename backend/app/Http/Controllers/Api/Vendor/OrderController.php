<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Concerns\Paginatable;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Vendor\Concerns\ResolvesRestaurantOwner;
use App\Models\BookingCharge;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\RestaurantTable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    use ResolvesRestaurantOwner;
    use Paginatable;

    public function index(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        $query = $owner->orders()->with(['items.menuItem', 'table', 'booking.room'])->orderBy('id', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $hasDateRange = $request->filled('from') || $request->filled('to');
        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->date('from'));
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->date('to'));
        }

        // The live Kitchen/Tables board polls this every 15s with no
        // filters — bound it to orders still in play so the query (and
        // payload) doesn't grow with the restaurant's entire order history.
        // Reports passes an explicit date range when it wants
        // completed/cancelled orders too, and gets a real paginated
        // response instead of the live board's plain array.
        if (!$request->filled('status') && !$hasDateRange) {
            $query->whereNotIn('status', [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED]);
        }

        if ($hasDateRange) {
            return response()->json($this->paginateQuery($query, $request, 100));
        }

        return response()->json($query->get());
    }

    public function store(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        if ($blocked = $this->blockIfOwnerUnapproved($user, $owner, 'take orders')) {
            return $blocked;
        }

        // Room Service only makes sense for a hotel's Restaurant POS — an
        // Activity (bungee jumping, rafting, ...) has no rooms to deliver to.
        $allowedOrderTypes = $owner instanceof \App\Models\Hotel
            ? ['dine_in', 'room_service', 'takeaway']
            : ['dine_in', 'takeaway'];

        $validated = $request->validate([
            'table_id' => 'nullable|exists:restaurant_tables,id',
            'booking_id' => 'nullable|exists:bookings,id',
            'order_type' => 'required|in:' . implode(',', $allowedOrderTypes),
            'channel' => 'sometimes|in:direct,uber_eats,doordash',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.notes' => 'nullable|string',
        ]);

        // Some vendors want stock reserved the moment an order is placed
        // (the default); others don't want it touched until the kitchen
        // actually finishes the order — see stock_deduction_mode on the
        // owner, configurable from the Menu tab's Inventory Settings.
        $deductNow = ($owner->stock_deduction_mode ?? Order::STOCK_DEDUCTION_ON_ORDER) === Order::STOCK_DEDUCTION_ON_ORDER;

        $order = DB::transaction(function () use ($validated, $owner, $user, $deductNow) {
            $subtotal = 0;
            $itemsToCreate = [];

            foreach ($validated['items'] as $line) {
                $menuItem = $owner->menuItems()->lockForUpdate()->findOrFail($line['menu_item_id']);

                if ($deductNow && $menuItem->stock_quantity !== null && $menuItem->stock_quantity < $line['quantity']) {
                    abort(422, "Not enough stock for \"{$menuItem->name}\" — only {$menuItem->stock_quantity} left.");
                }

                $lineSubtotal = $menuItem->price * $line['quantity'];
                $subtotal += $lineSubtotal;

                $itemsToCreate[] = [
                    'menu_item_id' => $menuItem->id,
                    'quantity' => $line['quantity'],
                    'unit_price' => $menuItem->price,
                    'subtotal' => $lineSubtotal,
                    'notes' => $line['notes'] ?? null,
                ];

                if ($deductNow && $menuItem->stock_quantity !== null) {
                    $menuItem->decrement('stock_quantity', $line['quantity']);
                }
            }

            $order = $owner->orders()->create([
                'table_id' => $validated['table_id'] ?? null,
                'booking_id' => $validated['booking_id'] ?? null,
                'order_type' => $validated['order_type'],
                'channel' => $validated['channel'] ?? Order::CHANNEL_DIRECT,
                'status' => Order::STATUS_PENDING,
                'stock_deducted' => $deductNow,
                'subtotal' => $subtotal,
                'total_amount' => $subtotal,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $user->id,
            ]);

            foreach ($itemsToCreate as $item) {
                $order->items()->create($item);
            }

            if ($order->table_id) {
                RestaurantTable::where('id', $order->table_id)->update(['status' => RestaurantTable::STATUS_OCCUPIED]);
            }

            return $order;
        });

        return response()->json([
            'message' => 'Order created successfully',
            'order' => $order->load(['items.menuItem', 'table', 'booking.room']),
        ], 201);
    }

    public function updateStatus(Request $request, $orderId)
    {
        $user = auth()->user();
        $order = Order::findOrFail($orderId);

        if ($blocked = $this->authorizeOwnerOfRecord($user, $order, 'edit')) {
            return $blocked;
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,confirmed,preparing,ready,served,completed,cancelled',
        ]);

        // Cancelling releases whatever stock this order had reserved — only
        // if stock was actually deducted for it (depends on the owner's
        // stock_deduction_mode — an "on_complete" order cancelled before
        // ever completing never touched stock, so there's nothing to undo),
        // and only once, so re-cancelling an already-cancelled order is a no-op.
        if ($validated['status'] === Order::STATUS_CANCELLED && $order->status !== Order::STATUS_CANCELLED && $order->stock_deducted) {
            DB::transaction(function () use ($order) {
                foreach ($order->items()->with('menuItem')->get() as $line) {
                    if ($line->menuItem && $line->menuItem->stock_quantity !== null) {
                        $line->menuItem->increment('stock_quantity', $line->quantity);
                    }
                }
            });
            $order->update(['stock_deducted' => false]);
        }

        // "On complete" owners hold off deducting stock until the order
        // actually finishes — do that here, once, the first time it reaches
        // completed.
        if ($validated['status'] === Order::STATUS_COMPLETED && !$order->stock_deducted) {
            DB::transaction(function () use ($order) {
                foreach ($order->items()->with('menuItem')->get() as $line) {
                    if ($line->menuItem && $line->menuItem->stock_quantity !== null) {
                        $line->menuItem->decrement('stock_quantity', $line->quantity);
                    }
                }
            });
            $order->update(['stock_deducted' => true]);
        }

        // Room-charge integration: a completed order tied to a booking gets
        // posted to that booking's folio automatically — this is the one
        // integration point between Restaurant POS and the hotel/activity
        // booking side. firstOrCreate keyed on the order keeps this
        // idempotent if updateStatus is ever called again for an order
        // that's already completed.
        if ($validated['status'] === Order::STATUS_COMPLETED && $order->booking_id) {
            BookingCharge::firstOrCreate(
                ['chargeable_type' => Order::class, 'chargeable_id' => $order->id],
                [
                    'booking_id' => $order->booking_id,
                    'description' => "Restaurant order {$order->order_number}",
                    'amount' => $order->total_amount,
                    'status' => BookingCharge::STATUS_POSTED,
                    'created_by' => $user->id,
                    'posted_at' => now(),
                ]
            );
        }

        $order->update(['status' => $validated['status']]);

        // Keep per-item kitchen tracking in step with the whole-order status
        // so a ticket never shows items lagging behind a column the order
        // card has already moved past (e.g. the order is "ready" but an
        // item still reads "pending").
        $itemStatusMap = [
            Order::STATUS_PREPARING => OrderItem::STATUS_PREPARING,
            Order::STATUS_READY => OrderItem::STATUS_READY,
            Order::STATUS_SERVED => OrderItem::STATUS_SERVED,
            Order::STATUS_COMPLETED => OrderItem::STATUS_SERVED,
        ];
        if (isset($itemStatusMap[$validated['status']])) {
            $itemStatus = $itemStatusMap[$validated['status']];
            $now = now();
            foreach ($order->items as $line) {
                $update = ['status' => $itemStatus];
                if ($itemStatus === OrderItem::STATUS_PREPARING && !$line->started_at) {
                    $update['started_at'] = $now;
                }
                if (in_array($itemStatus, [OrderItem::STATUS_READY, OrderItem::STATUS_SERVED]) && !$line->ready_at) {
                    $update['ready_at'] = $now;
                }
                $line->update($update);
            }
        }

        if ($order->table_id && in_array($validated['status'], [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])) {
            $stillActive = Order::where('table_id', $order->table_id)
                ->where('id', '!=', $order->id)
                ->whereNotIn('status', [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])
                ->exists();

            if (!$stillActive) {
                RestaurantTable::where('id', $order->table_id)->update(['status' => RestaurantTable::STATUS_AVAILABLE]);
            }
        }

        return response()->json([
            'message' => 'Order status updated successfully',
            'order' => $order->load(['items.menuItem', 'table', 'booking.room']),
        ]);
    }

    public function updateRush(Request $request, $orderId)
    {
        $user = auth()->user();
        $order = Order::findOrFail($orderId);

        if ($blocked = $this->authorizeOwnerOfRecord($user, $order, 'edit')) {
            return $blocked;
        }

        $validated = $request->validate([
            'is_rush' => 'required|boolean',
        ]);

        $order->update(['is_rush' => $validated['is_rush']]);

        return response()->json([
            'message' => 'Order updated',
            'order' => $order->load(['items.menuItem', 'table', 'booking.room']),
        ]);
    }

    public function transferTable(Request $request, $orderId)
    {
        $user = auth()->user();
        $order = Order::findOrFail($orderId);

        if ($blocked = $this->authorizeOwnerOfRecord($user, $order, 'edit')) {
            return $blocked;
        }

        if (in_array($order->status, [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])) {
            return response()->json(['message' => 'Cannot move a completed or cancelled order.'], 422);
        }

        $validated = $request->validate([
            // Same-owner scoping so a table can't be transferred to a
            // different vendor's dining room by ID guessing.
            'table_id' => ['required', Rule::exists('restaurant_tables', 'id')
                ->where('owner_type', $order->owner_type)
                ->where('owner_id', $order->owner_id)],
        ]);

        if ((string) $validated['table_id'] === (string) $order->table_id) {
            return response()->json(['message' => 'Order is already at that table.'], 422);
        }

        DB::transaction(function () use ($order, $validated) {
            $previousTableId = $order->table_id;

            $order->update(['table_id' => $validated['table_id']]);
            RestaurantTable::where('id', $validated['table_id'])->update(['status' => RestaurantTable::STATUS_OCCUPIED]);

            if ($previousTableId) {
                $stillActive = Order::where('table_id', $previousTableId)
                    ->where('id', '!=', $order->id)
                    ->whereNotIn('status', [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])
                    ->exists();
                if (!$stillActive) {
                    RestaurantTable::where('id', $previousTableId)->update(['status' => RestaurantTable::STATUS_AVAILABLE]);
                }
            }
        });

        return response()->json([
            'message' => 'Order moved to new table',
            'order' => $order->fresh()->load(['items.menuItem', 'table', 'booking.room']),
        ]);
    }

    /**
     * Merges this order's line items into another open order on the same
     * check (e.g. two tables pushed together for one party) — the source
     * order is left with no items and marked cancelled with a note, the
     * target absorbs the items and its totals. Stock/charges are untouched:
     * the items already existed, only which order they bill to changes.
     */
    public function mergeInto(Request $request, $orderId)
    {
        $user = auth()->user();
        $order = Order::findOrFail($orderId);

        if ($blocked = $this->authorizeOwnerOfRecord($user, $order, 'edit')) {
            return $blocked;
        }

        if (in_array($order->status, [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])) {
            return response()->json(['message' => 'Cannot merge a completed or cancelled order.'], 422);
        }

        $validated = $request->validate([
            'target_order_id' => ['required', Rule::exists('orders', 'id')
                ->where('owner_type', $order->owner_type)
                ->where('owner_id', $order->owner_id)
                ->whereNotIn('status', [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])],
        ]);

        if ((int) $validated['target_order_id'] === $order->id) {
            return response()->json(['message' => 'Cannot merge an order into itself.'], 422);
        }

        $targetOrder = Order::findOrFail($validated['target_order_id']);

        DB::transaction(function () use ($order, $targetOrder) {
            $previousTableId = $order->table_id;

            $order->items()->update(['order_id' => $targetOrder->id]);

            $targetOrder->refresh();
            $newSubtotal = $targetOrder->items()->sum('subtotal');
            $targetOrder->update(['subtotal' => $newSubtotal, 'total_amount' => $newSubtotal]);

            $order->update([
                'subtotal' => 0,
                'total_amount' => 0,
                'status' => Order::STATUS_CANCELLED,
                'notes' => trim(($order->notes ? $order->notes . ' — ' : '') . "Merged into {$targetOrder->order_number}"),
            ]);

            if ($previousTableId) {
                $stillActive = Order::where('table_id', $previousTableId)
                    ->where('id', '!=', $order->id)
                    ->whereNotIn('status', [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])
                    ->exists();
                if (!$stillActive) {
                    RestaurantTable::where('id', $previousTableId)->update(['status' => RestaurantTable::STATUS_AVAILABLE]);
                }
            }
        });

        return response()->json([
            'message' => "Merged into {$targetOrder->order_number}",
            'order' => $targetOrder->fresh()->load(['items.menuItem', 'table', 'booking.room']),
        ]);
    }

    public function updateItemStatus(Request $request, $orderId, $itemId)
    {
        $user = auth()->user();
        $order = Order::findOrFail($orderId);

        if ($blocked = $this->authorizeOwnerOfRecord($user, $order, 'edit')) {
            return $blocked;
        }

        $item = $order->items()->findOrFail($itemId);

        $validated = $request->validate([
            'status' => 'required|in:pending,preparing,ready,served',
        ]);

        $update = ['status' => $validated['status']];
        if ($validated['status'] === OrderItem::STATUS_PREPARING && !$item->started_at) {
            $update['started_at'] = now();
        }
        if (in_array($validated['status'], [OrderItem::STATUS_READY, OrderItem::STATUS_SERVED]) && !$item->ready_at) {
            $update['ready_at'] = now();
        }
        $item->update($update);

        // Once every item on the ticket has reached (or passed) a given
        // stage, bring the whole order card along automatically — this is
        // what lets the kitchen work item-by-item while front-of-house
        // still sees one order status per table.
        $itemRank = ['pending' => 0, 'preparing' => 1, 'ready' => 2, 'served' => 3];
        $orderRank = [
            Order::STATUS_PENDING => 0,
            Order::STATUS_CONFIRMED => 0,
            Order::STATUS_PREPARING => 1,
            Order::STATUS_READY => 2,
            Order::STATUS_SERVED => 3,
        ];
        $orderStatusForRank = [1 => Order::STATUS_PREPARING, 2 => Order::STATUS_READY, 3 => Order::STATUS_SERVED];

        $minItemRank = $order->items()->pluck('status')->map(fn ($s) => $itemRank[$s] ?? 0)->min();
        $currentOrderRank = $orderRank[$order->status] ?? 0;

        if (
            $minItemRank >= 1
            && $minItemRank > $currentOrderRank
            && !in_array($order->status, [Order::STATUS_SERVED, Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])
        ) {
            $order->update(['status' => $orderStatusForRank[$minItemRank]]);
        }

        return response()->json([
            'message' => 'Item status updated',
            'order' => $order->fresh()->load(['items.menuItem', 'table', 'booking.room']),
        ]);
    }

    public function show($orderId)
    {
        $user = auth()->user();
        $order = Order::with(['items.menuItem', 'table', 'booking.room'])->findOrFail($orderId);

        if ($blocked = $this->authorizeOwnerOfRecord($user, $order, 'view')) {
            return $blocked;
        }

        return response()->json($order);
    }
}
