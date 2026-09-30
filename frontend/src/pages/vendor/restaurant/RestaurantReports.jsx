import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, DollarSign, Loader2, Receipt, UtensilsCrossed, Wallet, XCircle } from 'lucide-react';
import { Badge, Button, Input, StatCard } from '../../../components/ui';
import { vendorAPI } from '../../../services/api';
import { useRestaurant } from './context/RestaurantContext';
import { CHANNEL_LABEL, ORDER_TYPE_ICON, REPORT_PRESETS } from './constants';

const RestaurantReports = () => {
  const { ownerType, ownerId, orders, toast } = useRestaurant();

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportFrom, setReportFrom] = useState(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  const [reportTo, setReportTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const loadReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const response = await vendorAPI.getEarningsReport(ownerType, ownerId, { from: reportFrom, to: reportTo });
      setReport(response.data);
    } catch (error) {
      console.error('Failed to load report', error);
      toast.error('Failed to load report');
    } finally {
      setReportLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerType, ownerId, reportFrom, reportTo]);

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportFrom, reportTo]);

  const applyReportPreset = (days) => {
    const to = new Date();
    const from = new Date(Date.now() - days * 86400000);
    setReportFrom(from.toISOString().slice(0, 10));
    setReportTo(to.toISOString().slice(0, 10));
  };

  // Order-level breakdown for Reports — the earnings endpoint only returns
  // aggregates, so this reuses the orders already loaded for Kitchen and
  // filters them to the selected report date range client-side.
  const reportOrders = useMemo(() => {
    const from = new Date(reportFrom + 'T00:00:00');
    const to = new Date(reportTo + 'T23:59:59');
    return orders
      .filter((o) => {
        const created = new Date(o.created_at);
        return created >= from && created <= to;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [orders, reportFrom, reportTo]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <Input label="From" type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} />
        <Input label="To" type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
        <Button size="sm" onClick={loadReport} loading={reportLoading}>Apply</Button>
        <div className="flex gap-1.5 ml-auto">
          {REPORT_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyReportPreset(p.days)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {reportLoading || !report ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} title="Total Revenue" value={`$${report.total_revenue.toFixed(2)}`} tone="success" />
            <StatCard icon={Receipt} title="Orders (served/completed)" value={report.orders_count} tone="primary" />
            <StatCard icon={Wallet} title="Avg Order Value" value={`$${report.avg_order_value.toFixed(2)}`} tone="accent" />
            <StatCard
              icon={XCircle}
              title="Cancelled (lost sales)"
              value={`$${report.cancelled_value.toFixed(2)}`}
              hint={`${report.cancelled_count} order(s)`}
              tone="warning"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-card p-4">
              <h4 className="font-semibold text-neutral-900 mb-4">Revenue by Order Type</h4>
              {report.revenue_by_type.length === 0 ? (
                <p className="text-sm text-neutral-500">No revenue in this period.</p>
              ) : (
                (() => {
                  const max = Math.max(...report.revenue_by_type.map((r) => Number(r.total)), 1);
                  return (
                    <div className="space-y-3">
                      {report.revenue_by_type.map((row) => (
                        <div key={row.order_type}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize text-neutral-700 font-medium">{row.order_type.replace('_', ' ')} <span className="text-neutral-400 font-normal">({row.count})</span></span>
                            <span className="font-semibold text-neutral-900">${Number(row.total).toFixed(2)}</span>
                          </div>
                          <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full transition-all"
                              style={{ width: `${(Number(row.total) / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>

            <div className="bg-white rounded-2xl border border-neutral-100 shadow-card p-4">
              <h4 className="font-semibold text-neutral-900 mb-4">Top Selling Items</h4>
              {report.top_items.length === 0 ? (
                <p className="text-sm text-neutral-500">No sales in this period.</p>
              ) : (
                (() => {
                  const max = Math.max(...report.top_items.map((i) => Number(i.revenue)), 1);
                  return (
                    <div className="space-y-3">
                      {report.top_items.map((item) => (
                        <div key={item.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-neutral-700 font-medium">{item.name} <span className="text-neutral-400 font-normal">× {item.quantity_sold}</span></span>
                            <span className="font-semibold text-neutral-900">${Number(item.revenue).toFixed(2)}</span>
                          </div>
                          <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent-500 rounded-full transition-all"
                              style={{ width: `${(Number(item.revenue) / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {report.low_stock_items.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Low Stock Items
              </h4>
              <div className="space-y-1">
                {report.low_stock_items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm text-amber-800">
                    <span>{item.name}</span>
                    <span>{item.stock_quantity} left (threshold {item.low_stock_threshold})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-neutral-100 shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
              <h4 className="font-semibold text-neutral-900">Orders in this period</h4>
              <span className="text-xs text-neutral-400">{reportOrders.length} order(s)</span>
            </div>
            {reportOrders.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-8">No orders in this date range.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {reportOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const TypeIcon = ORDER_TYPE_ICON[order.order_type] || UtensilsCrossed;
                  return (
                    <div key={order.id}>
                      <button
                        type="button"
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <TypeIcon className="h-4 w-4 text-primary-600 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-neutral-900 text-sm">{order.order_number}</span>
                              <Badge status={order.status} />
                            </div>
                            <p className="text-xs text-neutral-500">
                              {new Date(order.created_at).toLocaleString()}
                              {order.table && ` · Table ${order.table.table_number}`}
                              {order.channel && order.channel !== 'direct' && ` · ${CHANNEL_LABEL[order.channel] || order.channel}`}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold text-neutral-900 shrink-0">${Number(order.total_amount).toFixed(2)}</span>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-3 -mt-1">
                          <div className="bg-neutral-50 rounded-lg p-3 space-y-1">
                            {order.items?.map((line) => (
                              <div key={line.id} className="flex justify-between text-xs text-neutral-600">
                                <span>{line.quantity}x {line.menu_item?.name}</span>
                                <span>${Number(line.subtotal).toFixed(2)}</span>
                              </div>
                            ))}
                            {order.notes && (
                              <p className="text-xs text-amber-600 pt-1 border-t border-neutral-200 mt-1">Note: {order.notes}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantReports;
