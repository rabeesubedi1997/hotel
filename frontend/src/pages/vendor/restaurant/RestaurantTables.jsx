import { useMemo, useState } from 'react';
import { ArrowRightLeft, CheckCircle2, Circle, Combine, Edit, Grid3x3, Plus, Trash2, Users, X } from 'lucide-react';
import { Badge, Button, StatCard } from '../../../components/ui';
import { vendorAPI } from '../../../services/api';
import { useRestaurant } from './context/RestaurantContext';
import { ITEM_STATUS_LABEL } from './constants';
import TableFormModal from './modals/TableFormModal';

// Floor-plan color bar per table status, mirroring the Kitchen ticket's
// urgency header so the whole POS reads as one visual system.
const STATUS_BAR_CLASS = {
  available: 'bg-green-500',
  occupied: 'bg-accent-500',
  reserved: 'bg-secondary-500',
};

const RestaurantTables = () => {
  const { tables, setTables, orders, setOrders, isApproved, loadAll, toast } = useRestaurant();
  const [tableFormOpen, setTableFormOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const [merging, setMerging] = useState(false);

  const activeOrderForTable = (tableId) =>
    orders.find((o) => o.table_id === tableId && !['completed', 'cancelled'].includes(o.status));

  // Ungrouped tables (no section set) fall into one catch-all zone rather
  // than being hidden — a vendor who hasn't set up sections yet still sees
  // every table.
  const sections = useMemo(() => {
    const groups = new Map();
    tables.forEach((table) => {
      const key = table.section || 'Dining Room';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(table);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tables]);

  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;
  const selectedOrder = selectedTable ? activeOrderForTable(selectedTable.id) : null;

  // Other tables with an active order of their own — valid merge targets.
  const mergeCandidates = selectedOrder
    ? orders.filter((o) => o.id !== selectedOrder.id && !['completed', 'cancelled'].includes(o.status) && o.table_id)
    : [];

  const openAddTableForm = () => {
    setEditingTable(null);
    setTableFormOpen(true);
  };

  const openEditTableForm = (table) => {
    setEditingTable(table);
    setTableFormOpen(true);
  };

  const handleTableDelete = async (id) => {
    if (!window.confirm('Delete this table?')) return;
    try {
      await vendorAPI.deleteTable(id);
      setTables((prev) => prev.filter((t) => t.id !== id));
      if (selectedTableId === id) setSelectedTableId(null);
      toast.success('Table deleted!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete table');
    }
  };

  // Quick one-click status change, separate from the full edit form —
  // this is the everyday action (seating/clearing a table), while Edit
  // is for changing the table number/capacity.
  const setTableStatus = async (table, status) => {
    if (table.status === status) return;
    try {
      const response = await vendorAPI.updateTable(table.id, { status });
      setTables((prev) => prev.map((t) => (t.id === table.id ? response.data.table : t)));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update table status');
    }
  };

  const transferOrder = async (targetTableId) => {
    if (!selectedOrder || !targetTableId) return;
    setTransferring(true);
    try {
      const response = await vendorAPI.transferOrderTable(selectedOrder.id, targetTableId);
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? response.data.order : o)));
      loadAll();
      toast.success('Order moved to new table');
      setSelectedTableId(Number(targetTableId));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to move order');
    } finally {
      setTransferring(false);
    }
  };

  const mergeOrder = async (targetOrderId) => {
    if (!selectedOrder || !targetOrderId) return;
    if (!window.confirm('Merge this table\'s order into the selected one? This table will be cleared.')) return;
    setMerging(true);
    try {
      const response = await vendorAPI.mergeOrder(selectedOrder.id, targetOrderId);
      setOrders((prev) => prev.map((o) => (o.id === response.data.order.id ? response.data.order : o)));
      loadAll();
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to merge order');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-display headline-sm text-on-surface">Floor Plan</h2>
        <Button size="sm" onClick={openAddTableForm} disabled={!isApproved}>
          <Plus className="h-4 w-4" />
          Add Table
        </Button>
      </div>

      {tables.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard icon={CheckCircle2} title="Free" value={tables.filter((t) => t.status === 'available').length} tone="success" />
          <StatCard icon={Users} title="Occupied" value={tables.filter((t) => t.status === 'occupied').length} tone="warning" />
          <StatCard icon={Circle} title="Reserved" value={tables.filter((t) => t.status === 'reserved').length} tone="primary" />
        </div>
      )}

      {tables.length === 0 ? (
        <div className="col-span-full bg-white rounded-3xl border border-dashed border-neutral-200 py-16 text-center">
          <Grid3x3 className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500 mb-4">No tables added yet. Set up your dining room layout.</p>
          <Button size="sm" onClick={openAddTableForm} disabled={!isApproved} className="mx-auto">
            <Plus className="h-4 w-4" />
            Add Your First Table
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {sections.map(([sectionName, sectionTables]) => (
              <div key={sectionName}>
                <h3 className="font-display text-label-md text-neutral-500 uppercase tracking-wide mb-3">{sectionName}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {sectionTables.map((table) => {
                    const order = activeOrderForTable(table.id);
                    const isSelected = table.id === selectedTableId;
                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => setSelectedTableId(table.id)}
                        className={`text-left bg-white rounded-2xl overflow-hidden transition-all ${
                          isSelected ? 'shadow-card-hover ring-2 ring-primary-500' : 'shadow-card hover:shadow-card-hover'
                        }`}
                      >
                        <div className={`h-1.5 ${STATUS_BAR_CLASS[table.status] || 'bg-neutral-300'}`} />
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-display font-bold text-on-surface">Table {table.table_number}</span>
                            <Badge status={table.status} />
                          </div>
                          <p className="text-body-sm text-neutral-500 flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" /> Seats {table.capacity}
                          </p>
                          {order && (
                            <p className="mt-2 text-body-sm text-primary-700 bg-primary-50 rounded-lg px-2 py-1 truncate">
                              {order.order_number} · ${Number(order.total_amount).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Selected-table detail panel */}
          <div className="lg:sticky lg:top-6 self-start">
            {!selectedTable ? (
              <div className="bg-white rounded-3xl shadow-card p-6 text-center">
                <Grid3x3 className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-body-sm text-neutral-500">Select a table to see its order and manage it.</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-card overflow-hidden">
                <div className={`h-1.5 ${STATUS_BAR_CLASS[selectedTable.status] || 'bg-neutral-300'}`} />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-display headline-sm text-on-surface">Table {selectedTable.table_number}</h3>
                    <button onClick={() => setSelectedTableId(null)} className="text-neutral-400 hover:text-neutral-700">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-body-sm text-neutral-500 mb-4">{selectedTable.section || 'Dining Room'} · Seats {selectedTable.capacity}</p>

                  <div className="grid grid-cols-3 gap-1.5 mb-4">
                    {['available', 'occupied', 'reserved'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setTableStatus(selectedTable, status)}
                        disabled={!isApproved}
                        className={`text-body-sm capitalize py-1.5 rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                          selectedTable.status === status
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        {status === 'available' ? 'Free' : status}
                      </button>
                    ))}
                  </div>

                  {selectedOrder ? (
                    <div className="border-t border-neutral-100 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-display font-semibold text-on-surface">{selectedOrder.order_number}</span>
                        <Badge status={selectedOrder.status} />
                      </div>
                      <div className="space-y-1.5 mb-3">
                        {selectedOrder.items?.map((line) => (
                          <div key={line.id} className="flex items-center justify-between text-body-sm">
                            <span className="text-neutral-700">{line.quantity}x {line.menu_item?.name}</span>
                            <span className="text-label-caps text-neutral-400">{ITEM_STATUS_LABEL[line.status || 'pending']}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-display text-price-display text-on-surface border-t border-neutral-100 pt-3 mb-4">
                        <span className="text-headline-sm">Total</span>
                        <span>${Number(selectedOrder.total_amount).toFixed(2)}</span>
                      </div>

                      <div className="space-y-2">
                        <label className="text-label-caps text-neutral-400 flex items-center gap-1.5">
                          <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer to table
                        </label>
                        <select
                          disabled={transferring}
                          onChange={(e) => e.target.value && transferOrder(e.target.value)}
                          value=""
                          className="w-full text-body-sm border border-neutral-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        >
                          <option value="">Choose a table...</option>
                          {tables.filter((t) => t.id !== selectedTable.id).map((t) => (
                            <option key={t.id} value={t.id}>Table {t.table_number} ({t.status})</option>
                          ))}
                        </select>

                        {mergeCandidates.length > 0 && (
                          <>
                            <label className="text-label-caps text-neutral-400 flex items-center gap-1.5 pt-1">
                              <Combine className="h-3.5 w-3.5" /> Merge into another check
                            </label>
                            <select
                              disabled={merging}
                              onChange={(e) => e.target.value && mergeOrder(e.target.value)}
                              value=""
                              className="w-full text-body-sm border border-neutral-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                            >
                              <option value="">Choose an order...</option>
                              {mergeCandidates.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.order_number} — Table {tables.find((t) => t.id === o.table_id)?.table_number ?? '?'}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-body-sm text-neutral-400 border-t border-neutral-100 pt-4">No active order at this table.</p>
                  )}

                  <div className="flex items-center gap-2 mt-5 pt-4 border-t border-neutral-100">
                    <button onClick={() => openEditTableForm(selectedTable)} disabled={!isApproved} className="flex-1 flex items-center justify-center gap-1.5 text-body-sm font-medium text-primary-700 bg-primary-50 rounded-xl py-2 hover:bg-primary-100 disabled:opacity-30 disabled:cursor-not-allowed">
                      <Edit className="h-4 w-4" /> Edit
                    </button>
                    <button onClick={() => handleTableDelete(selectedTable.id)} disabled={!isApproved} className="flex items-center justify-center gap-1.5 text-body-sm font-medium text-red-600 bg-red-50 rounded-xl py-2 px-4 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <TableFormModal open={tableFormOpen} editingTable={editingTable} onClose={() => setTableFormOpen(false)} />
    </div>
  );
};

export default RestaurantTables;
