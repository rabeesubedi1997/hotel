import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Clock3, DollarSign, Loader2, Receipt, UtensilsCrossed, Wallet, XCircle } from 'lucide-react';
import { Badge, Button, Input, StatCard } from '../../../components/ui';
import { vendorAPI } from '../../../services/api';
import { useRestaurant } from './context/RestaurantContext';
import { CHANNEL_LABEL, ORDER_TYPE_ICON, REPORT_PRESETS, STATION_LABEL } from './constants';
import RevenueTrendChart from './charts/RevenueTrendChart';
import ChannelDonut from './charts/ChannelDonut';

const RestaurantReports = () => {
  const { ownerType, ownerId, toast } = useRestaurant();

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportOrders, setReportOrders] = useState([]);
  const [reportOrdersLoading, setReportOrdersLoading] = useState(false);
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

  // Order-level breakdown for Reports — the live board's `orders` (Kitchen
  // Context) only ever holds currently-active orders now, so this fetches
  // its own date-ranged page directly instead (the backend returns a real
  // paginated response whenever `from`/`to` is present — see
  // OrderController::index). per_page: 100 (its allowed max before this
  // needs its own pager) comfortably covers a month of most restaurants'
  // orders; narrow the date range for a busier one.
  const loadReportOrders = useCallback(async () => {
    setReportOrdersLoading(true);
    try {
      const response = await vendorAPI.getOrders(ownerType, ownerId, { from: reportFrom, to: reportTo, per_page: 100 });
      setReportOrders(response.data.data || []);
    } catch (error) {
      console.error('Failed to load report orders', error);
      toast.error('Failed to load order breakdown');
    } finally {
      setReportOrdersLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerType, ownerId, reportFrom, reportTo]);

  useEffect(() => {
    loadReport();
    loadReportOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadReport();
    loadReportOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportFrom, reportTo]);

  const applyReportPreset = (days) => {
    const to = new Date();
    const from = new Date(Date.now() - days * 86400000);
    setReportFrom(from.toISOString().slice(0, 10));
    setReportTo(to.toISOString().slice(0, 10));
  };

  return (
    <div>
      <h2 className="font-display headline-sm text-on-surface mb-4">Analytics</h2>
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
              className="text-body-sm font-medium px-3.5 py-1.5 rounded-full border border-neutral-200 text-outline hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-card p-5">
              <h4 className="font-display headline-sm text-on-surface mb-1">Revenue Trend</h4>
              <p className="text-body-sm text-neutral-500 mb-3">Daily revenue for the selected period</p>
              <RevenueTrendChart data={report.revenue_by_day || []} />
            </div>

            <div className="bg-white rounded-3xl shadow-card p-5">
              <h4 className="font-display headline-sm text-on-surface mb-4">Revenue by Channel</h4>
              <ChannelDonut data={report.revenue_by_channel || []} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl shadow-card p-5">
              <h4 className="font-display headline-sm text-on-surface mb-4">Revenue by Order Type</h4>
              {report.revenue_by_type.length === 0 ? (
                <p className="text-body-sm text-neutral-500">No revenue in this period.</p>
              ) : (
                (() => {
                  const max = Math.max(...report.revenue_by_type.map((r) => Number(r.total)), 1);
                  return (
                    <div className="space-y-3.5">
                      {report.revenue_by_type.map((row) => (
                        <div key={row.order_type}>
                          <div className="flex justify-between text-body-sm mb-1.5">
                            <span className="capitalize text-on-surface font-medium">{row.order_type.replace('_', ' ')} <span className="text-neutral-400 font-normal">({row.count})</span></span>
                            <span className="font-semibold text-on-surface">${Number(row.total).toFixed(2)}</span>
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

            <div className="bg-white rounded-3xl shadow-card p-5">
              <h4 className="font-display headline-sm text-on-surface mb-4">Top Selling Items</h4>
              {report.top_items.length === 0 ? (
                <p className="text-body-sm text-neutral-500">No sales in this period.</p>
              ) : (
                (() => {
                  const max = Math.max(...report.top_items.map((i) => Number(i.revenue)), 1);
                  return (
                    <div className="space-y-3.5">
                      {report.top_items.map((item) => (
                        <div key={item.id}>
                          <div className="flex justify-between text-body-sm mb-1.5">
                            <span className="text-on-surface font-medium">{item.name} <span className="text-neutral-400 font-normal">× {item.quantity_sold}</span></span>
                            <span className="font-semibold text-on-surface">${Number(item.revenue).toFixed(2)}</span>
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

            <div className="bg-white rounded-3xl shadow-card p-5">
              <h4 className="font-display headline-sm text-on-surface mb-1 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-secondary-600" />
                Station Throughput
              </h4>
              <p className="text-body-sm text-neutral-500 mb-4">Avg minutes from fired to ready</p>
              {(report.station_throughput || []).length === 0 ? (
                <p className="text-body-sm text-neutral-500">No timed tickets in this period.</p>
              ) : (
                <div className="space-y-3">
                  {report.station_throughput.map((row) => (
                    <div key={row.station} className="flex items-center justify-between">
                      <div>
                        <p className="text-body-sm font-medium text-on-surface">{STATION_LABEL[row.station] || row.station}</p>
                        <p className="text-label-caps text-neutral-400">{row.tickets} tickets</p>
                      </div>
                      <span className="font-display text-headline-sm text-secondary-700">{Math.round(row.avg_minutes)}m</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {report.low_stock_items.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5">
              <h4 className="font-display headline-sm text-amber-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Low Stock Items
              </h4>
              <div className="space-y-1.5">
                {report.low_stock_items.map((item) => (
                  <div key={item.id} className="flex justify-between text-body-sm text-amber-800">
                    <span>{item.name}</span>
                    <span>{item.stock_quantity} left (threshold {item.low_stock_threshold})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h4 className="font-display headline-sm text-on-surface">Orders in this period</h4>
              <span className="text-label-caps text-neutral-400">{reportOrders.length} order(s)</span>
            </div>
            {reportOrdersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              </div>
            ) : reportOrders.length === 0 ? (
              <p className="text-body-sm text-neutral-500 text-center py-8">No orders in this date range.</p>
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
                        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-neutral-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="h-9 w-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                            <TypeIcon className="h-4 w-4 text-primary-600" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-display font-semibold text-on-surface text-body-md">{order.order_number}</span>
                              <Badge status={order.status} />
                            </div>
                            <p className="text-body-sm text-neutral-500">
                              {new Date(order.created_at).toLocaleString()}
                              {order.table && ` · Table ${order.table.table_number}`}
                              {order.channel && order.channel !== 'direct' && ` · ${CHANNEL_LABEL[order.channel] || order.channel}`}
                            </p>
                          </div>
                        </div>
                        <span className="font-display font-semibold text-on-surface shrink-0">${Number(order.total_amount).toFixed(2)}</span>
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-4 -mt-1">
                          <div className="bg-neutral-50 rounded-2xl p-3.5 space-y-1">
                            {order.items?.map((line) => (
                              <div key={line.id} className="flex justify-between text-body-sm text-neutral-600">
                                <span>{line.quantity}x {line.menu_item?.name}</span>
                                <span>${Number(line.subtotal).toFixed(2)}</span>
                              </div>
                            ))}
                            {order.notes && (
                              <p className="text-body-sm text-amber-600 pt-1.5 border-t border-neutral-200 mt-1.5">Note: {order.notes}</p>
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
