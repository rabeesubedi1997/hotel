import { useState } from 'react';
import { CheckCircle2, Circle, Edit, Grid3x3, Plus, Trash2, Users } from 'lucide-react';
import { Badge, Button, StatCard } from '../../../components/ui';
import { vendorAPI } from '../../../services/api';
import { useRestaurant } from './context/RestaurantContext';
import TableFormModal from './modals/TableFormModal';

// Floor-plan color bar per table status, mirroring the Kitchen ticket's
// urgency header so the whole POS reads as one visual system.
const STATUS_BAR_CLASS = {
  available: 'bg-green-500',
  occupied: 'bg-amber-500',
  reserved: 'bg-secondary-500',
};

const RestaurantTables = () => {
  const { tables, setTables, orders, isApproved, toast } = useRestaurant();
  const [tableFormOpen, setTableFormOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);

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

  return (
    <div>
      <div className="flex justify-end mb-4">
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map((table) => {
          const activeOrder = orders.find((o) => o.table_id === table.id && !['completed', 'cancelled'].includes(o.status));
          return (
            <div key={table.id} className="bg-white rounded-2xl border border-neutral-100 shadow-card overflow-hidden">
              <div className={`h-1.5 ${STATUS_BAR_CLASS[table.status] || 'bg-neutral-300'}`} />
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display font-bold text-neutral-900">Table {table.table_number}</span>
                  <Badge status={table.status} />
                </div>
                <p className="text-sm text-neutral-500 mb-3 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Seats {table.capacity}
                </p>
                {activeOrder && (
                  <p className="text-xs text-primary-700 bg-primary-50 rounded-lg px-2 py-1 mb-3">
                    Order {activeOrder.order_number} · {activeOrder.status}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-1 mb-3">
                  {['available', 'occupied', 'reserved'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setTableStatus(table, status)}
                      disabled={!isApproved}
                      className={`text-xs capitalize py-1 rounded-md border disabled:opacity-30 disabled:cursor-not-allowed ${
                        table.status === status
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      {status === 'available' ? 'Free' : status}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditTableForm(table)} disabled={!isApproved} className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed" title="Edit">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleTableDelete(table.id)} disabled={!isApproved} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {tables.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-dashed border-neutral-200 py-16 text-center">
            <Grid3x3 className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500 mb-4">No tables added yet. Set up your dining room layout.</p>
            <Button size="sm" onClick={openAddTableForm} disabled={!isApproved} className="mx-auto">
              <Plus className="h-4 w-4" />
              Add Your First Table
            </Button>
          </div>
        )}
      </div>

      <TableFormModal open={tableFormOpen} editingTable={editingTable} onClose={() => setTableFormOpen(false)} />
    </div>
  );
};

export default RestaurantTables;
