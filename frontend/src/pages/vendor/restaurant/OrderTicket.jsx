import { BedDouble, CheckCircle2, Flame, Printer, Timer, UtensilsCrossed } from 'lucide-react';
import { elapsedMinutes } from './hooks/useKitchenOrders';
import { ACTION_LABEL, CHANNEL_LABEL, ITEM_NEXT_STATUS, ITEM_STATUS_LABEL, NEXT_STATUS, ORDER_TYPE_ICON, urgencyBarClass } from './constants';

/**
 * A single kitchen ticket card — extracted from the Kitchen tab's inline
 * markup so the KDS grid (RestaurantKitchen.jsx) only has to lay tickets
 * out, not build them. Behavior (advance/rush/print/cancel/item-toggle) is
 * unchanged from the original monolith, just handed in via callbacks.
 */
const OrderTicket = ({ order, now, onAdvance, onToggleItemStatus, onToggleRush, onPrint, onCancel }) => {
  const minutes = elapsedMinutes(order, now);
  const readyCount = order.items?.filter((i) => ['ready', 'served'].includes(i.status)).length || 0;
  const itemCount = order.items?.length || 0;
  const activeTracking = !['served', 'completed', 'cancelled'].includes(order.status);
  const TypeIcon = ORDER_TYPE_ICON[order.order_type] || UtensilsCrossed;

  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col ${order.is_rush ? 'border-red-300 ring-1 ring-red-200' : 'border-neutral-100'}`}>
      {/* Colored priority header — spot a running-late ticket at a glance */}
      <div className={`px-3 py-2 flex items-center justify-between ${urgencyBarClass(minutes, !activeTracking)}`}>
        <span className="font-display font-bold text-sm leading-none flex items-center gap-1.5">
          {order.order_number}
          {order.is_rush && <Flame className="h-3.5 w-3.5" />}
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold">
          <Timer className="h-3.5 w-3.5" />
          {minutes < 1 ? 'just now' : `${minutes}m`}
        </span>
      </div>
      {/* Metadata subhead */}
      <div className="px-3 py-1.5 bg-neutral-50 flex items-center justify-between text-xs text-neutral-500 border-b border-neutral-100">
        <span className="flex items-center gap-1 font-medium text-neutral-700 capitalize">
          <TypeIcon className="h-3.5 w-3.5 text-primary-600" />
          {order.order_type.replace('_', ' ')}
        </span>
        <span className="flex items-center gap-2">
          {order.channel && order.channel !== 'direct' && (
            <span className="text-[10px] font-bold uppercase text-secondary-700 bg-secondary-100 px-1.5 py-0.5 rounded">
              {CHANNEL_LABEL[order.channel] || order.channel}
            </span>
          )}
          {order.table && <span>Table {order.table.table_number}</span>}
          {order.booking && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded" title={`Charged to ${order.booking.booking_number}`}>
              <BedDouble className="h-3 w-3" />
              {order.booking.room ? `Rm ${order.booking.room.room_number}` : 'Room'}
            </span>
          )}
        </span>
      </div>

      <div className="p-3 flex-1 flex flex-col">
        {itemCount > 0 && activeTracking && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
              <span>{readyCount}/{itemCount} items ready</span>
            </div>
            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${itemCount ? (readyCount / itemCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
        <ul className="text-xs text-neutral-700 mb-2 space-y-1 flex-1">
          {order.items?.map((line) => {
            const lineStatus = line.status || 'pending';
            const isDone = ['ready', 'served'].includes(lineStatus);
            return (
              <li key={line.id}>
                <button
                  type="button"
                  onClick={() => activeTracking && onToggleItemStatus(order, line)}
                  disabled={!activeTracking || !ITEM_NEXT_STATUS[lineStatus]}
                  className={`w-full flex items-start gap-2 text-left px-2 py-1.5 rounded-lg transition ${
                    isDone ? 'bg-green-50 text-green-700' : 'bg-neutral-50 hover:bg-neutral-100'
                  } ${activeTracking && ITEM_NEXT_STATUS[lineStatus] ? 'cursor-pointer' : 'cursor-default'}`}
                  title={activeTracking ? `Mark ${ITEM_STATUS_LABEL[ITEM_NEXT_STATUS[lineStatus]] || ''}` : ''}
                >
                  <span className={`mt-0.5 h-4 w-4 rounded-full border shrink-0 flex items-center justify-center ${isDone ? 'bg-green-500 border-green-500' : 'border-neutral-300'}`}>
                    {isDone && <CheckCircle2 className="h-3 w-3 text-white" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block font-semibold ${isDone ? 'line-through decoration-green-400 text-green-700' : 'text-neutral-800'}`}>
                      {line.quantity}x {line.menu_item?.name}
                    </span>
                    {line.notes && <span className="block text-[11px] text-amber-600 font-normal">Note: {line.notes}</span>}
                  </span>
                  <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${isDone ? 'text-green-600' : 'text-neutral-400'}`}>
                    {ITEM_STATUS_LABEL[lineStatus]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-sm font-bold text-neutral-900 mb-2">${Number(order.total_amount).toFixed(2)}</p>
      </div>

      {/* Bold bump action bar, mirrors a real KDS's primary touch target */}
      <div className="p-2 bg-neutral-50 border-t border-neutral-100">
        {NEXT_STATUS[order.status] && (
          <button
            onClick={() => onAdvance(order)}
            className="w-full text-xs font-bold uppercase tracking-wide bg-primary-600 text-white rounded-lg py-2.5 hover:bg-primary-700 transition-colors"
          >
            {ACTION_LABEL[order.status]}
          </button>
        )}
        <div className="grid grid-cols-2 gap-1 mt-1">
          {activeTracking && (
            <button
              onClick={() => onToggleRush(order)}
              className={`flex items-center justify-center gap-1 text-xs font-medium rounded-lg py-1.5 ${
                order.is_rush ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <Flame className="h-3.5 w-3.5" /> {order.is_rush ? 'Unflag Rush' : 'Mark Rush'}
            </button>
          )}
          <button
            onClick={() => onPrint(order)}
            className="flex items-center justify-center gap-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg py-1.5"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
        {activeTracking && (
          <button
            onClick={() => onCancel(order)}
            className="w-full text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg py-1.5 mt-1"
          >
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderTicket;
