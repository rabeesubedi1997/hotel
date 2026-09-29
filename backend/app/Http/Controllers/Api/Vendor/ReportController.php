<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Vendor\Concerns\ResolvesRestaurantOwner;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    use ResolvesRestaurantOwner;

    // Revenue only counts orders that actually got served/completed —
    // cancelled orders are reported separately as lost sales, not revenue.
    public function earnings(Request $request, $ownerId)
    {
        $user = auth()->user();
        $owner = $this->resolveOwner($user, $this->ownerTypeFromRequest($request), $ownerId);

        $from = $request->filled('from') ? Carbon::parse($request->input('from'))->startOfDay() : now()->subDays(29)->startOfDay();
        $to = $request->filled('to') ? Carbon::parse($request->input('to'))->endOfDay() : now()->endOfDay();

        $revenueStatuses = [Order::STATUS_SERVED, Order::STATUS_COMPLETED];

        $baseQuery = $owner->orders()->whereBetween('created_at', [$from, $to]);

        $revenueOrders = (clone $baseQuery)->whereIn('status', $revenueStatuses);
        $totalRevenue = (clone $revenueOrders)->sum('total_amount');
        $ordersCount = (clone $revenueOrders)->count();
        $avgOrderValue = $ordersCount > 0 ? round($totalRevenue / $ordersCount, 2) : 0;

        $revenueByType = (clone $revenueOrders)
            ->selectRaw('order_type, SUM(total_amount) as total, COUNT(*) as count')
            ->groupBy('order_type')
            ->get();

        $cancelled = (clone $baseQuery)->where('status', Order::STATUS_CANCELLED);
        $cancelledCount = (clone $cancelled)->count();
        $cancelledValue = (clone $cancelled)->sum('total_amount');

        $ordersByStatus = (clone $baseQuery)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $topItems = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('menu_items', 'menu_items.id', '=', 'order_items.menu_item_id')
            ->where('orders.owner_type', $owner->getMorphClass())
            ->where('orders.owner_id', $owner->id)
            ->whereIn('orders.status', $revenueStatuses)
            ->whereBetween('orders.created_at', [$from, $to])
            ->selectRaw('menu_items.id, menu_items.name, SUM(order_items.quantity) as quantity_sold, SUM(order_items.subtotal) as revenue')
            ->groupBy('menu_items.id', 'menu_items.name')
            ->orderByDesc('quantity_sold')
            ->limit(10)
            ->get();

        $lowStockItems = $owner->menuItems()
            ->whereNotNull('stock_quantity')
            ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
            ->get(['id', 'name', 'stock_quantity', 'low_stock_threshold']);

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'total_revenue' => (float) $totalRevenue,
            'orders_count' => $ordersCount,
            'avg_order_value' => (float) $avgOrderValue,
            'revenue_by_type' => $revenueByType,
            'orders_by_status' => $ordersByStatus,
            'cancelled_count' => $cancelledCount,
            'cancelled_value' => (float) $cancelledValue,
            'top_items' => $topItems,
            'low_stock_items' => $lowStockItems,
        ]);
    }
}
