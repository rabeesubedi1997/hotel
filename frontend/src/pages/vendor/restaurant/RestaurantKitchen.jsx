import { useMemo, useState } from 'react';
import { Flame, Grid3x3, Plus, Receipt, Timer, Users } from 'lucide-react';
import { Badge, Button, StatCard } from '../../../components/ui';
import { vendorAPI } from '../../../services/api';
import useAuthStore from '../../../stores/authStore';
import { useRestaurant } from './context/RestaurantContext';
import { useKitchenOrders, elapsedMinutes } from './hooks/useKitchenOrders';
import { ITEM_NEXT_STATUS, KITCHEN_COLUMNS, NEXT_STATUS, STATION_LABEL, STATION_OPTIONS } from './constants';
import OrderTicket from './OrderTicket';
import OrderFormModal from './modals/OrderFormModal';
import KitchenStaffModal from './modals/KitchenStaffModal';

const RestaurantKitchen = () => {
  const { ownerType, orders, tables, menuItems, setOrders, isApproved, loadAll, toast } = useRestaurant();
  const { hasAnyPermission } = useAuthStore();
  // A scoped Kitchen Staff login only holds restaurant.kitchen.*, never the
  // full hotels/activities.*.own permissions — hide the actions that
  // require actually owning the property (taking new orders, managing who
  // else gets kitchen access) rather than let them 403 on click.
  const canManageRestaurant = hasAnyPermission(['hotels.edit.own', 'activities.edit.own']);
  const [kitchenTypeFilter, setKitchenTypeFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);

  // Only offer stations actually assigned to a menu item here — a seafood
  // shack's kitchen screen shouldn't show a "Pastry" tab it'll never use.
  const stationsInUse = useMemo(
    () => STATION_OPTIONS.filter((s) => menuItems.some((m) => m.station === s.value)),
    [menuItems]
  );

  // Station routing narrows the board (and its stats) to tickets that
  // actually have a line for this station — e.g. the grill screen doesn't
  // need to count or show a dessert-only order. OrderTicket itself further
  // narrows which LINES within a ticket render.
  const stationScopedOrders = useMemo(
    () => stationFilter === 'all'
      ? orders
      : orders.filter((o) => o.items?.some((i) => i.menu_item?.station === stationFilter)),
    [orders, stationFilter]
  );

  const { now, kitchenOrders, activeKitchenOrders, avgTicketMinutes, delayedOrders, mostDelayedOrder } =
    useKitchenOrders(stationScopedOrders, kitchenTypeFilter);

  const advanceOrder = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      const response = await vendorAPI.updateOrderStatus(order.id, next);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? response.data.order : o)));
      if (next === 'completed' || next === 'served') {
        loadAll();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update order');
    }
  };

  const toggleItemStatus = async (order, item) => {
    const next = ITEM_NEXT_STATUS[item.status || 'pending'];
    if (!next) return;
    try {
      const response = await vendorAPI.updateOrderItemStatus(order.id, item.id, next);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? response.data.order : o)));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update item');
    }
  };

  const toggleRush = async (order) => {
    try {
      const response = await vendorAPI.updateOrderRush(order.id, !order.is_rush);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? response.data.order : o)));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update rush flag');
    }
  };

  const cancelOrder = async (order) => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      const response = await vendorAPI.updateOrderStatus(order.id, 'cancelled');
      setOrders((prev) => prev.map((o) => (o.id === order.id ? response.data.order : o)));
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  const printChit = (order) => {
    const win = window.open('', '_blank', 'width=380,height=600');
    if (!win) return;
    const itemRows = (order.items || []).map((line) => `
      <tr>
        <td style="padding:4px 0;">${line.quantity}x ${line.menu_item?.name || ''}</td>
      </tr>
      ${line.notes ? `<tr><td style="padding:0 0 4px 16px;font-style:italic;color:#555;">Note: ${line.notes}</td></tr>` : ''}
    `).join('');
    win.document.write(`
      <html>
        <head>
          <title>${order.order_number}</title>
          <style>
            body { font-family: monospace; padding: 16px; }
            h1 { font-size: 20px; margin: 0 0 4px; }
            p { margin: 2px 0; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
            hr { border: none; border-top: 1px dashed #999; margin: 10px 0; }
          </style>
        </head>
        <body onload="window.print()">
          <h1>${order.order_number}</h1>
          <p>${order.order_type.replace('_', ' ').toUpperCase()}${order.table ? ' · TABLE ' + order.table.table_number : ''}</p>
          <p>${new Date(order.created_at).toLocaleString()}</p>
          <hr />
          <table>${itemRows}</table>
          <hr />
          <p style="font-weight:bold;">Total: $${Number(order.total_amount).toFixed(2)}</p>
          ${order.notes ? `<p>Order notes: ${order.notes}</p>` : ''}
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { key: 'all', label: 'All' },
            { key: 'dine_in', label: 'Dine-in' },
            { key: 'room_service', label: 'Room Service' },
            { key: 'takeaway', label: 'Takeaway' },
          ]
            .filter((f) => f.key !== 'room_service' || ownerType === 'hotel')
            .map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setKitchenTypeFilter(f.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                kitchenTypeFilter === f.key ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {f.label}
              <span className={`px-1.5 rounded text-[10px] font-bold ${kitchenTypeFilter === f.key ? 'bg-white/20' : 'bg-white text-neutral-500'}`}>
                {f.key === 'all' ? orders.length : orders.filter((o) => o.order_type === f.key).length}
              </span>
            </button>
          ))}
        </div>
        {canManageRestaurant && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setStaffModalOpen(true)} disabled={!isApproved}>
              <Users className="h-4 w-4" />
              Kitchen Staff
            </Button>
            <Button size="sm" onClick={() => setOrderFormOpen(true)} disabled={!isApproved}>
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </div>
        )}
      </div>

      {stationsInUse.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto mb-4">
          <button
            type="button"
            onClick={() => setStationFilter('all')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              stationFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            All Stations
          </button>
          {stationsInUse.map((station) => (
            <button
              key={station.value}
              type="button"
              onClick={() => setStationFilter(station.value)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                stationFilter === station.value ? 'bg-primary-600 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {STATION_LABEL[station.value] || station.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Receipt} title="Active Orders" value={activeKitchenOrders.length} tone="primary" />
        <StatCard icon={Timer} title="Avg Ticket Time" value={`${avgTicketMinutes}m`} tone="neutral" />
        <StatCard icon={Flame} title="Rush / Delayed" value={delayedOrders.length} tone={delayedOrders.length > 0 ? 'warning' : 'neutral'} />
        <StatCard icon={Grid3x3} title="Tables Occupied" value={tables.filter((t) => t.status === 'occupied').length} tone="accent" />
      </div>

      {mostDelayedOrder && (
        <div className="w-full bg-red-50 border border-red-200 text-red-800 px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 mb-4">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Flame className="h-4 w-4 text-red-600" />
            Rush alert: {mostDelayedOrder.order_number} has been active for {elapsedMinutes(mostDelayedOrder, now)}m
            {mostDelayedOrder.table ? ` — Table ${mostDelayedOrder.table.table_number}` : ''}. Clear it next.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {KITCHEN_COLUMNS.map((status) => {
          const columnOrders = kitchenOrders.filter((o) => o.status === status);
          return (
            <div key={status} className="bg-neutral-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold capitalize text-neutral-700">{status}</h3>
                <span className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-neutral-400">{columnOrders.length}</span>
                  <Badge status={status} />
                </span>
              </div>
              <div className="space-y-2">
                {columnOrders.map((order) => (
                  <OrderTicket
                    key={order.id}
                    order={order}
                    now={now}
                    stationFilter={stationFilter}
                    onAdvance={advanceOrder}
                    onToggleItemStatus={toggleItemStatus}
                    onToggleRush={toggleRush}
                    onPrint={printChit}
                    onCancel={cancelOrder}
                  />
                ))}
                {columnOrders.length === 0 && (
                  <p className="text-xs text-neutral-400 text-center py-4">No orders</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {canManageRestaurant && (
        <>
          <OrderFormModal open={orderFormOpen} onClose={() => setOrderFormOpen(false)} />
          <KitchenStaffModal open={staffModalOpen} onClose={() => setStaffModalOpen(false)} />
        </>
      )}
    </div>
  );
};

export default RestaurantKitchen;
