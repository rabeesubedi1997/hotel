import { useEffect, useMemo, useState } from 'react';

// Kitchen tickets that sit this long without moving get flagged as running late.
export const RUSH_THRESHOLD_MINUTES = 20;

// Kitchen-realistic urgency: how long an order has sat since it was placed,
// color-coded the way a real KDS flags tickets that are running late.
export const elapsedMinutes = (order, now) => Math.max(0, Math.floor((now - new Date(order.created_at).getTime()) / 60000));

/**
 * Derived kitchen stats (elapsed-time ticker, rush/delayed detection, avg
 * ticket time) for a given order list — extracted verbatim from the old
 * Restaurant.jsx monolith. Kept as its own hook so it can be unit-tested and
 * reused by both the Kitchen tab and the dashboard stat tiles without
 * duplicating the "exclude served/completed/cancelled" rule (see the
 * c7b9731 fix this logic depends on).
 */
export const useKitchenOrders = (orders, typeFilter) => {
  // Ticks the Kitchen board's elapsed-time badges forward without waiting
  // on the next order poll.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);

  const kitchenOrders = useMemo(
    () => (typeFilter === 'all' ? orders : orders.filter((o) => o.order_type === typeFilter)),
    [orders, typeFilter]
  );

  // "Active" for the headline count = anything not yet completed/cancelled
  // (still needs front-of-house action, e.g. closing out a served order).
  const activeKitchenOrders = useMemo(
    () => kitchenOrders.filter((o) => !['completed', 'cancelled'].includes(o.status)),
    [kitchenOrders]
  );

  // Kitchen urgency (avg ticket time, rush/delayed count, the rush banner)
  // must stop counting an order once it's served — the kitchen's job is
  // done at that point, so a ticket sitting in "served" for hours waiting
  // on checkout is not a kitchen delay and shouldn't trip a rush alert.
  const kitchenWorkingOrders = useMemo(
    () => kitchenOrders.filter((o) => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)),
    [kitchenOrders]
  );

  const avgTicketMinutes = useMemo(() => {
    if (kitchenWorkingOrders.length === 0) return 0;
    const total = kitchenWorkingOrders.reduce((sum, o) => sum + elapsedMinutes(o, now), 0);
    return Math.round(total / kitchenWorkingOrders.length);
  }, [kitchenWorkingOrders, now]);

  const delayedOrders = useMemo(
    () => kitchenWorkingOrders.filter((o) => o.is_rush || elapsedMinutes(o, now) >= RUSH_THRESHOLD_MINUTES),
    [kitchenWorkingOrders, now]
  );

  const mostDelayedOrder = useMemo(() => {
    if (delayedOrders.length === 0) return null;
    return [...delayedOrders].sort((a, b) => elapsedMinutes(b, now) - elapsedMinutes(a, now))[0];
  }, [delayedOrders, now]);

  return { now, kitchenOrders, activeKitchenOrders, kitchenWorkingOrders, avgTicketMinutes, delayedOrders, mostDelayedOrder };
};
