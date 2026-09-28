<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Hotel;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\RestaurantTable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    private function blockIfUnapproved($user, Hotel $hotel): ?JsonResponse
    {
        if ($user->isAdminLevel() || $hotel->approval_status === Hotel::APPROVAL_STATUS_APPROVED) {
            return null;
        }

        return response()->json([
            'message' => 'This hotel must be verified by an admin before you can take orders.',
        ], 403);
    }

    private function resolveHotel($user, $hotelId): Hotel
    {
        if ($user->isAdminLevel()) {
            return Hotel::findOrFail($hotelId);
        }

        return Hotel::where('user_id', $user->id)->findOrFail($hotelId);
    }

    public function index(Request $request, $hotelId)
    {
        $user = auth()->user();
        $hotel = $this->resolveHotel($user, $hotelId);

        $query = $hotel->orders()->with(['items.menuItem', 'table'])->orderBy('id', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json($query->get());
    }

    public function store(Request $request, $hotelId)
    {
        $user = auth()->user();
        $hotel = $this->resolveHotel($user, $hotelId);

        if ($blocked = $this->blockIfUnapproved($user, $hotel)) {
            return $blocked;
        }

        $validated = $request->validate([
            'table_id' => 'nullable|exists:restaurant_tables,id',
            'booking_id' => 'nullable|exists:bookings,id',
            'order_type' => 'required|in:dine_in,room_service,takeaway',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.notes' => 'nullable|string',
        ]);

        $order = DB::transaction(function () use ($validated, $hotel, $user) {
            $subtotal = 0;
            $itemsToCreate = [];

            foreach ($validated['items'] as $line) {
                $menuItem = MenuItem::where('hotel_id', $hotel->id)->lockForUpdate()->findOrFail($line['menu_item_id']);

                if ($menuItem->stock_quantity !== null && $menuItem->stock_quantity < $line['quantity']) {
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

                if ($menuItem->stock_quantity !== null) {
                    $menuItem->decrement('stock_quantity', $line['quantity']);
                }
            }

            $order = Order::create([
                'hotel_id' => $hotel->id,
                'table_id' => $validated['table_id'] ?? null,
                'booking_id' => $validated['booking_id'] ?? null,
                'order_type' => $validated['order_type'],
                'status' => Order::STATUS_PENDING,
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
            'order' => $order->load(['items.menuItem', 'table']),
        ], 201);
    }

    public function updateStatus(Request $request, $orderId)
    {
        $user = auth()->user();
        $order = Order::findOrFail($orderId);
        $hotel = $order->hotel;

        if (!$user->isAdminLevel() && $hotel->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,confirmed,preparing,ready,served,completed,cancelled',
        ]);

        // Cancelling releases whatever stock this order had reserved —
        // only once, so re-cancelling an already-cancelled order is a no-op.
        if ($validated['status'] === Order::STATUS_CANCELLED && $order->status !== Order::STATUS_CANCELLED) {
            DB::transaction(function () use ($order) {
                foreach ($order->items()->with('menuItem')->get() as $line) {
                    if ($line->menuItem && $line->menuItem->stock_quantity !== null) {
                        $line->menuItem->increment('stock_quantity', $line->quantity);
                    }
                }
            });
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
            'order' => $order->load(['items.menuItem', 'table']),
        ]);
    }

    public function updateItemStatus(Request $request, $orderId, $itemId)
    {
        $user = auth()->user();
        $order = Order::findOrFail($orderId);
        $hotel = $order->hotel;

        if (!$user->isAdminLevel() && $hotel->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
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
            'order' => $order->fresh()->load(['items.menuItem', 'table']),
        ]);
    }

    public function show($orderId)
    {
        $user = auth()->user();
        $order = Order::with(['items.menuItem', 'table'])->findOrFail($orderId);
        $hotel = $order->hotel;

        if (!$user->isAdminLevel() && $hotel->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($order);
    }
}
