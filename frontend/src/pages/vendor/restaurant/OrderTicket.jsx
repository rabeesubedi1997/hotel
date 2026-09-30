import { BedDouble, CheckCircle2, Flame, Printer, Timer, UtensilsCrossed } from 'lucide-react';
import { elapsedMinutes } from './hooks/useKitchenOrders';
import { ACTION_LABEL, CHANNEL_LABEL, ITEM_NEXT_STATUS, ITEM_STATUS_LABEL, NEXT_STATUS, ORDER_TYPE_ICON, urgencyBarClass } from './constants';

/**
 * A single kitchen ticket card — extracted from the Kitchen tab's inline
 * markup so the KDS grid (RestaurantKitchen.jsx) only has to lay tickets
 * out, not build them. Behavior (advance/rush/print/cancel/item-toggle) is
 * unchanged from the original monolith, just handed in via callbacks.
 */
const OrderTicket = ({ order, now, stationFilter = 'all', canAdvanceItems = true, onAdvance, onToggleItemStatus, onToggleRush, onPrint, onCancel }) => {
  const minutes = elapsedMinutes(order, now);
  // Station routing narrows which lines this screen shows (e.g. the grill
  // screen only needs grill items) — the order itself still advances as a
  // whole via the item-status ranking in OrderController, so counts here
  // are scoped to the visible lines, not the full ticket.
  const visibleItems = stationFilter === 'all'
    ? (order.items || [])
    : (order.items || []).filter((i) => i.menu_item?.station === stationFilter);
  const readyCount = visibleItems.filter((i) => ['ready', 'served'].includes(i.status)).length;
  const itemCount = visibleItems.length;
  const activeTracking = !['served', 'completed', 'cancelled'].includes(order.status);
  const TypeIcon = ORDER_TYPE_ICON[order.order_type] || UtensilsCrossed;

  return (
    <div className={`bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-shadow overflow-hidden flex flex-col ${order.is_rush ? 'ring-2 ring-red-300' : ''}`}>
      {/* Colored priority header — spot a running-late ticket at a glance */}
      <div className={`px-4 py-3 flex items-center justify-between ${urgencyBarClass(minutes, !activeTracking)}`}>
        <span className="font-display font-bold text-base leading-none flex items-center gap-1.5">
          {order.order_number}
          {order.is_rush && <Flame className="h-4 w-4" />}
        </span>
        <span className="flex items-center gap-1 text-label-md">
          <Timer className="h-3.5 w-3.5" />
          {minutes < 1 ? 'just now' : `${minutes}m`}
        </span>
      </div>
      {/* Metadata subhead */}
      <div className="px-4 py-2 bg-neutral-50 flex items-center justify-between border-b border-neutral-100">
        <span className="flex items-center gap-1.5 font-semibold text-on-surface capitalize text-body-sm">
          <TypeIcon className="h-4 w-4 text-primary-600" />
          {order.order_type.replace('_', ' ')}
        </span>
        <span className="flex items-center gap-1.5">
          {order.channel && order.channel !== 'direct' && (
            <span className="text-label-caps text-secondary-700 bg-secondary-100 px-2 py-0.5 rounded-full">
              {CHANNEL_LABEL[order.channel] || order.channel}
            </span>
          )}
          {order.table && <span className="text-body-sm text-outline font-medium">Table {order.table.table_number}</span>}
          {order.booking && (
            <span className="flex items-center gap-1 text-label-caps text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full" title={`Charged to ${order.booking.booking_number}`}>
              <BedDouble className="h-3 w-3" />
              {order.booking.room ? `Rm ${order.booking.room.room_number}` : 'Room'}
            </span>
          )}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {itemCount > 0 && activeTracking && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-body-sm text-outline mb-1.5">
              <span className="font-medium">{readyCount}/{itemCount} items ready</span>
            </div>
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${itemCount ? (readyCount / itemCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
        <ul className="mb-3 space-y-1.5 flex-1">
          {visibleItems.map((line) => {
            const lineStatus = line.status || 'pending';
            const isDone = ['ready', 'served'].includes(lineStatus);
            return (
              <li key={line.id}>
                <button
                  type="button"
                  onClick={() => canAdvanceItems && activeTracking && onToggleItemStatus(order, line)}
                  disabled={!canAdvanceItems || !activeTracking || !ITEM_NEXT_STATUS[lineStatus]}
                  className={`w-full flex items-start gap-2.5 text-left px-3 py-2 rounded-xl transition ${
                    isDone ? 'bg-primary-50' : 'bg-neutral-50 hover:bg-neutral-100'
                  } ${canAdvanceItems && activeTracking && ITEM_NEXT_STATUS[lineStatus] ? 'cursor-pointer' : 'cursor-default'}`}
                  title={canAdvanceItems && activeTracking ? `Mark ${ITEM_STATUS_LABEL[ITEM_NEXT_STATUS[lineStatus]] || ''}` : ''}
                >
                  <span className={`mt-0.5 h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center ${isDone ? 'bg-primary-600 border-primary-600' : 'border-neutral-300'}`}>
                    {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block font-semibold text-body-md ${isDone ? 'line-through decoration-primary-300 text-primary-700' : 'text-on-surface'}`}>
                      {line.quantity}x {line.menu_item?.name}
                    </span>
                    {line.notes && <span className="block text-body-sm text-accent-600 font-normal mt-0.5">Note: {line.notes}</span>}
                  </span>
                  <span className={`shrink-0 text-label-caps ${isDone ? 'text-primary-600' : 'text-neutral-400'}`}>
                    {ITEM_STATUS_LABEL[lineStatus]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="font-display text-price-display text-on-surface">${Number(order.total_amount).toFixed(2)}</p>
      </div>

      {/* Bold bump action bar, mirrors a real KDS's primary touch target */}
      <div className="p-3 bg-neutral-50 border-t border-neutral-100">
        {NEXT_STATUS[order.status] && (
          <button
            onClick={() => onAdvance(order)}
            className="w-full text-label-caps text-white bg-primary-600 rounded-xl py-3 hover:bg-primary-700 shadow-sm transition-colors"
          >
            {ACTION_LABEL[order.status]}
          </button>
        )}
        <div className="grid grid-cols-2 gap-1.5 mt-1.5">
          {activeTracking && (
            <button
              onClick={() => onToggleRush(order)}
              className={`flex items-center justify-center gap-1.5 text-body-sm font-semibold rounded-xl py-2 transition-colors ${
                order.is_rush ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'text-outline hover:bg-neutral-100'
              }`}
            >
              <Flame className="h-4 w-4" /> {order.is_rush ? 'Unflag Rush' : 'Mark Rush'}
            </button>
          )}
          <button
            onClick={() => onPrint(order)}
            className="flex items-center justify-center gap-1.5 text-body-sm font-semibold text-outline hover:bg-neutral-100 rounded-xl py-2 transition-colors"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
        {activeTracking && (
          <button
            onClick={() => onCancel(order)}
            className="w-full text-body-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl py-2 mt-1.5 transition-colors"
          >
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderTicket;
