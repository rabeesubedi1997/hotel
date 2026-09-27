<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Hotel;
use App\Models\MenuItem;
use App\Models\Order;
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
                $menuItem = MenuItem::where('hotel_id', $hotel->id)->findOrFail($line['menu_item_id']);
                $lineSubtotal = $menuItem->price * $line['quantity'];
                $subtotal += $lineSubtotal;

                $itemsToCreate[] = [
                    'menu_item_id' => $menuItem->id,
                    'quantity' => $line['quantity'],
                    'unit_price' => $menuItem->price,
                    'subtotal' => $lineSubtotal,
                    'notes' => $line['notes'] ?? null,
                ];
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

        $order->update(['status' => $validated['status']]);

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
