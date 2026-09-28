import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Loader2, ArrowLeft, ChefHat, UtensilsCrossed, Grid3x3, Image as ImageIcon, X, BarChart3, AlertTriangle } from 'lucide-react';
import { vendorAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Textarea, Select, Modal, Table, Th, Td, Badge } from '../../components/ui';
import MediaPicker from '../../components/MediaPicker';

const emptyMenuForm = {
  name: '',
  description: '',
  price: '',
  category: 'main_course',
  image: '',
  is_available: true,
  track_inventory: false,
  stock_quantity: '',
  low_stock_threshold: 5,
};

const emptyTableForm = {
  table_number: '',
  capacity: 2,
  status: 'available',
};

const emptyOrderForm = {
  table_id: '',
  order_type: 'dine_in',
  notes: '',
  items: [],
};

const NEXT_STATUS = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'served',
  served: 'completed',
};

const KITCHEN_COLUMNS = ['pending', 'confirmed', 'preparing', 'ready', 'served'];

const ITEM_STATUS_LABEL = { pending: 'Pending', preparing: 'Preparing', ready: 'Ready', served: 'Served' };
const ITEM_NEXT_STATUS = { pending: 'preparing', preparing: 'ready', ready: 'served', served: null };

// Kitchen-realistic urgency: how long an order has sat since it was placed,
// color-coded the way a real KDS flags tickets that are running late.
const elapsedMinutes = (order, now) => Math.max(0, Math.floor((now - new Date(order.created_at).getTime()) / 60000));
const urgencyClass = (minutes) => {
  if (minutes >= 20) return 'bg-red-100 text-red-700 border border-red-200';
  if (minutes >= 10) return 'bg-amber-100 text-amber-700 border border-amber-200';
  return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
};

const VendorRestaurant = () => {
  const { hotelId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('kitchen');

  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);

  const [menuFormOpen, setMenuFormOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [menuFormData, setMenuFormData] = useState(emptyMenuForm);
  const [savingMenuItem, setSavingMenuItem] = useState(false);
  const [menuImagePickerOpen, setMenuImagePickerOpen] = useState(false);

  const [tableFormOpen, setTableFormOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableFormData, setTableFormData] = useState(emptyTableForm);
  const [savingTable, setSavingTable] = useState(false);

  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [orderFormData, setOrderFormData] = useState(emptyOrderForm);
  const [savingOrder, setSavingOrder] = useState(false);

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportFrom, setReportFrom] = useState(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  const [reportTo, setReportTo] = useState(() => new Date().toISOString().slice(0, 10));

  const isApproved = hotel?.approval_status === 'approved';

  const loadAll = useCallback(async () => {
    try {
      const [hotelRes, menuRes, tablesRes, ordersRes] = await Promise.all([
        vendorAPI.getHotel(hotelId),
        vendorAPI.getMenuItems(hotelId),
        vendorAPI.getTables(hotelId),
        vendorAPI.getOrders(hotelId),
      ]);
      setHotel(hotelRes.data);
      setMenuItems(menuRes.data || []);
      setTables(tablesRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (error) {
      console.error('Failed to load restaurant data', error);
      toast.error('Failed to load restaurant data');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    loadAll();
    const interval = setInterval(() => {
      vendorAPI.getOrders(hotelId).then((res) => setOrders(res.data || [])).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAll, hotelId]);

  // Ticks the Kitchen board's elapsed-time badges forward without waiting
  // on the next order poll.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);

  const loadReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const response = await vendorAPI.getEarningsReport(hotelId, { from: reportFrom, to: reportTo });
      setReport(response.data);
    } catch (error) {
      console.error('Failed to load report', error);
      toast.error('Failed to load report');
    } finally {
      setReportLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, reportFrom, reportTo]);

  useEffect(() => {
    if (tab === 'reports') {
      loadReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // --- Menu ---
  const openAddMenuForm = () => {
    setEditingMenuItem(null);
    setMenuFormData(emptyMenuForm);
    setMenuFormOpen(true);
  };

  const openEditMenuForm = (item) => {
    setEditingMenuItem(item);
    setMenuFormData({
      name: item.name || '',
      description: item.description || '',
      price: item.price ?? '',
      category: item.category || 'main_course',
      image: item.image || '',
      is_available: !!item.is_available,
      track_inventory: item.stock_quantity !== null && item.stock_quantity !== undefined,
      stock_quantity: item.stock_quantity ?? '',
      low_stock_threshold: item.low_stock_threshold ?? 5,
    });
    setMenuFormOpen(true);
  };

  const closeMenuForm = () => {
    setMenuFormOpen(false);
    setEditingMenuItem(null);
    setMenuFormData(emptyMenuForm);
  };

  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    setSavingMenuItem(true);
    const { track_inventory, ...rest } = menuFormData;
    const payload = {
      ...rest,
      stock_quantity: track_inventory ? Number(menuFormData.stock_quantity || 0) : null,
    };
    try {
      if (editingMenuItem) {
        const response = await vendorAPI.updateMenuItem(editingMenuItem.id, payload);
        setMenuItems((prev) => prev.map((m) => (m.id === editingMenuItem.id ? response.data.item : m)));
        toast.success('Menu item updated!');
      } else {
        const response = await vendorAPI.createMenuItem(hotelId, payload);
        setMenuItems((prev) => [response.data.item, ...prev]);
        toast.success('Menu item added!');
      }
      closeMenuForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save menu item');
    } finally {
      setSavingMenuItem(false);
    }
  };

  const handleMenuDelete = async (id) => {
    if (!window.confirm('Delete this menu item?')) return;
    try {
      await vendorAPI.deleteMenuItem(id);
      setMenuItems((prev) => prev.filter((m) => m.id !== id));
      toast.success('Menu item deleted!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete menu item');
    }
  };

  // --- Tables ---
  const openAddTableForm = () => {
    setEditingTable(null);
    setTableFormData(emptyTableForm);
    setTableFormOpen(true);
  };

  const openEditTableForm = (table) => {
    setEditingTable(table);
    setTableFormData({
      table_number: table.table_number || '',
      capacity: table.capacity ?? 2,
      status: table.status || 'available',
    });
    setTableFormOpen(true);
  };

  const closeTableForm = () => {
    setTableFormOpen(false);
    setEditingTable(null);
    setTableFormData(emptyTableForm);
  };

  const handleTableSubmit = async (e) => {
    e.preventDefault();
    setSavingTable(true);
    try {
      if (editingTable) {
        const response = await vendorAPI.updateTable(editingTable.id, tableFormData);
        setTables((prev) => prev.map((t) => (t.id === editingTable.id ? response.data.table : t)));
        toast.success('Table updated!');
      } else {
        const response = await vendorAPI.createTable(hotelId, tableFormData);
        setTables((prev) => [...prev, response.data.table]);
        toast.success('Table added!');
      }
      closeTableForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save table');
    } finally {
      setSavingTable(false);
    }
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

  // --- Orders / Kitchen ---
  const openNewOrder = () => {
    setOrderFormData(emptyOrderForm);
    setOrderFormOpen(true);
  };

  const closeOrderForm = () => {
    setOrderFormOpen(false);
    setOrderFormData(emptyOrderForm);
  };

  const addOrderLine = (menuItemId) => {
    setOrderFormData((prev) => {
      const existing = prev.items.find((i) => i.menu_item_id === menuItemId);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((i) => (i.menu_item_id === menuItemId ? { ...i, quantity: i.quantity + 1 } : i)),
        };
      }
      return { ...prev, items: [...prev.items, { menu_item_id: menuItemId, quantity: 1 }] };
    });
  };

  const changeOrderLineQty = (menuItemId, quantity) => {
    setOrderFormData((prev) => ({
      ...prev,
      items: quantity <= 0
        ? prev.items.filter((i) => i.menu_item_id !== menuItemId)
        : prev.items.map((i) => (i.menu_item_id === menuItemId ? { ...i, quantity } : i)),
    }));
  };

  const orderTotal = orderFormData.items.reduce((sum, line) => {
    const item = menuItems.find((m) => m.id === line.menu_item_id);
    return sum + (item ? Number(item.price) * line.quantity : 0);
  }, 0);

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (orderFormData.items.length === 0) {
      toast.error('Add at least one item to the order');
      return;
    }
    setSavingOrder(true);
    try {
      const payload = {
        order_type: orderFormData.order_type,
        notes: orderFormData.notes || undefined,
        table_id: orderFormData.order_type === 'dine_in' && orderFormData.table_id ? orderFormData.table_id : undefined,
        items: orderFormData.items,
      };
      const response = await vendorAPI.createOrder(hotelId, payload);
      setOrders((prev) => [response.data.order, ...prev]);
      if (response.data.order.table_id) {
        setTables((prev) => prev.map((t) => (t.id === response.data.order.table_id ? { ...t, status: 'occupied' } : t)));
      }
      toast.success('Order placed!');
      closeOrderForm();
      setTab('kitchen');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setSavingOrder(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate('/vendor/hotels')} className="p-2 rounded-lg hover:bg-neutral-100" title="Back to Hotels">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="font-display text-2xl font-bold text-neutral-900">
          Restaurant POS {hotel ? `— ${hotel.name}` : ''}
        </h2>
      </div>

      {!isApproved && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 mb-4">
          This hotel is pending admin verification — menu, table, and order changes unlock once it's approved. You can still view existing data below.
        </div>
      )}

      <div className="flex gap-2 border-b border-neutral-200 mb-6">
        {[
          { key: 'kitchen', label: 'Kitchen', icon: ChefHat },
          { key: 'menu', label: 'Menu', icon: UtensilsCrossed },
          { key: 'tables', label: 'Tables', icon: Grid3x3 },
          { key: 'reports', label: 'Reports', icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-primary-600 text-primary-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'kitchen' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={openNewOrder} disabled={!isApproved}>
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {KITCHEN_COLUMNS.map((status) => (
              <div key={status} className="bg-neutral-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold capitalize text-neutral-700">{status}</h3>
                  <Badge status={status} />
                </div>
                <div className="space-y-2">
                  {orders.filter((o) => o.status === status).map((order) => {
                    const minutes = elapsedMinutes(order, now);
                    const readyCount = order.items?.filter((i) => ['ready', 'served'].includes(i.status)).length || 0;
                    const itemCount = order.items?.length || 0;
                    const activeTracking = !['served', 'completed', 'cancelled'].includes(order.status);
                    return (
                      <div key={order.id} className="bg-white rounded-lg p-3 shadow-sm border border-neutral-100">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className="text-xs font-semibold text-neutral-900">{order.order_number}</span>
                          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${urgencyClass(minutes)}`}>
                            {minutes < 1 ? 'just now' : `${minutes}m`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-neutral-400 capitalize">{order.order_type.replace('_', ' ')}</span>
                          {order.table && <span className="text-xs text-neutral-500">Table {order.table.table_number}</span>}
                        </div>
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
                        <ul className="text-xs text-neutral-700 mb-2 space-y-1">
                          {order.items?.map((line) => {
                            const lineStatus = line.status || 'pending';
                            const isDone = ['ready', 'served'].includes(lineStatus);
                            return (
                              <li key={line.id}>
                                <button
                                  type="button"
                                  onClick={() => activeTracking && toggleItemStatus(order, line)}
                                  disabled={!activeTracking || !ITEM_NEXT_STATUS[lineStatus]}
                                  className={`w-full flex items-start justify-between gap-2 text-left px-1.5 py-1 rounded-md transition ${
                                    isDone ? 'bg-green-50 text-green-700' : 'hover:bg-neutral-50'
                                  } ${activeTracking && ITEM_NEXT_STATUS[lineStatus] ? 'cursor-pointer' : 'cursor-default'}`}
                                  title={activeTracking ? `Mark ${ITEM_STATUS_LABEL[ITEM_NEXT_STATUS[lineStatus]] || ''}` : ''}
                                >
                                  <span className={isDone ? 'line-through decoration-green-400' : ''}>
                                    {line.quantity}x {line.menu_item?.name}
                                    {line.notes && <span className="block text-[11px] text-amber-600 not-italic font-normal">Note: {line.notes}</span>}
                                  </span>
                                  <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${isDone ? 'text-green-600' : 'text-neutral-400'}`}>
                                    {ITEM_STATUS_LABEL[lineStatus]}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                        <p className="text-xs font-semibold text-neutral-900 mb-2">${Number(order.total_amount).toFixed(2)}</p>
                        <div className="flex gap-1">
                          {NEXT_STATUS[order.status] && (
                            <button
                              onClick={() => advanceOrder(order)}
                              className="flex-1 text-xs bg-primary-600 text-white rounded-md py-1.5 hover:bg-primary-700"
                            >
                              Mark {NEXT_STATUS[order.status]}
                            </button>
                          )}
                          <button
                            onClick={() => cancelOrder(order)}
                            className="text-xs text-red-600 hover:bg-red-50 rounded-md px-2"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {orders.filter((o) => o.status === status).length === 0 && (
                    <p className="text-xs text-neutral-400 text-center py-4">No orders</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'menu' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={openAddMenuForm} disabled={!isApproved}>
              <Plus className="h-4 w-4" />
              Add Menu Item
            </Button>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>Price</Th>
                <Th>Stock</Th>
                <Th>Available</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {menuItems.map((item) => (
                <tr key={item.id}>
                  <Td className="font-medium text-neutral-900">
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <img src={item.image} alt="" className="h-10 w-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="h-4 w-4 text-neutral-400" />
                        </div>
                      )}
                      {item.name}
                    </div>
                  </Td>
                  <Td className="capitalize">{item.category.replace('_', ' ')}</Td>
                  <Td>${Number(item.price).toFixed(2)}</Td>
                  <Td>
                    {item.stock_quantity === null ? (
                      <span className="text-xs text-neutral-400">Not tracked</span>
                    ) : (
                      <span className={`text-xs font-medium ${item.stock_quantity <= item.low_stock_threshold ? 'text-amber-600' : 'text-neutral-600'}`}>
                        {item.stock_quantity} in stock
                      </span>
                    )}
                  </Td>
                  <Td>
                    <Badge status={item.is_available ? 'active' : 'inactive'}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={() => openEditMenuForm(item)} disabled={!isApproved} className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleMenuDelete(item.id)} disabled={!isApproved} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
              {menuItems.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 sm:px-6 py-4 text-sm text-center text-neutral-500">
                    No menu items yet.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      )}

      {tab === 'tables' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={openAddTableForm} disabled={!isApproved}>
              <Plus className="h-4 w-4" />
              Add Table
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {tables.map((table) => (
              <div key={table.id} className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-neutral-900">Table {table.table_number}</span>
                  <Badge status={table.status} />
                </div>
                <p className="text-sm text-neutral-500 mb-3">Capacity: {table.capacity}</p>
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
            ))}
            {tables.length === 0 && (
              <p className="col-span-full text-center text-neutral-500 py-8">No tables added yet.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div>
          <div className="flex flex-wrap items-end gap-3 mb-6">
            <Input label="From" type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} />
            <Input label="To" type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
            <Button size="sm" onClick={loadReport} loading={reportLoading}>Apply</Button>
          </div>

          {reportLoading || !report ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
                  <p className="text-xs text-neutral-500 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">${report.total_revenue.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
                  <p className="text-xs text-neutral-500 mb-1">Orders (served/completed)</p>
                  <p className="text-2xl font-bold text-neutral-900">{report.orders_count}</p>
                </div>
                <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
                  <p className="text-xs text-neutral-500 mb-1">Avg Order Value</p>
                  <p className="text-2xl font-bold text-neutral-900">${report.avg_order_value.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
                  <p className="text-xs text-neutral-500 mb-1">Cancelled (lost sales)</p>
                  <p className="text-2xl font-bold text-red-600">${report.cancelled_value.toFixed(2)}</p>
                  <p className="text-xs text-neutral-400">{report.cancelled_count} order(s)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
                  <h4 className="font-semibold text-neutral-900 mb-3">Revenue by Order Type</h4>
                  {report.revenue_by_type.length === 0 ? (
                    <p className="text-sm text-neutral-500">No revenue in this period.</p>
                  ) : (
                    <div className="space-y-2">
                      {report.revenue_by_type.map((row) => (
                        <div key={row.order_type} className="flex justify-between text-sm">
                          <span className="capitalize text-neutral-600">{row.order_type.replace('_', ' ')} ({row.count})</span>
                          <span className="font-medium text-neutral-900">${Number(row.total).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
                  <h4 className="font-semibold text-neutral-900 mb-3">Top Selling Items</h4>
                  {report.top_items.length === 0 ? (
                    <p className="text-sm text-neutral-500">No sales in this period.</p>
                  ) : (
                    <div className="space-y-2">
                      {report.top_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-neutral-600">{item.name} × {item.quantity_sold}</span>
                          <span className="font-medium text-neutral-900">${Number(item.revenue).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {report.low_stock_items.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
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
            </div>
          )}
        </div>
      )}

      {/* Menu item form */}
      <Modal open={menuFormOpen} onClose={closeMenuForm} title={editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'} size="lg">
        <form onSubmit={handleMenuSubmit} className="space-y-4">
          <Input
            label="Name"
            type="text"
            required
            value={menuFormData.name}
            onChange={(e) => setMenuFormData({ ...menuFormData, name: e.target.value })}
          />
          <Textarea
            label="Description"
            rows={2}
            value={menuFormData.description}
            onChange={(e) => setMenuFormData({ ...menuFormData, description: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Price ($)"
              type="number"
              required
              min="0"
              step="0.01"
              value={menuFormData.price}
              onChange={(e) => setMenuFormData({ ...menuFormData, price: e.target.value })}
            />
            <Select
              label="Category"
              value={menuFormData.category}
              onChange={(e) => setMenuFormData({ ...menuFormData, category: e.target.value })}
            >
              <option value="starter">Starter</option>
              <option value="main_course">Main Course</option>
              <option value="dessert">Dessert</option>
              <option value="beverage">Beverage</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Image</label>
            {menuFormData.image ? (
              <div className="relative">
                <img src={menuFormData.image} alt="" className="h-32 w-full object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => setMenuFormData({ ...menuFormData, image: '' })}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setMenuImagePickerOpen(true)}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Choose from Media Library or Upload
              </Button>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={menuFormData.is_available}
              onChange={(e) => setMenuFormData({ ...menuFormData, is_available: e.target.checked })}
            />
            Available for ordering
          </label>

          <div className="border border-neutral-200 rounded-xl p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={menuFormData.track_inventory}
                onChange={(e) => setMenuFormData({ ...menuFormData, track_inventory: e.target.checked })}
              />
              Track stock for this item
            </label>
            {menuFormData.track_inventory && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Stock Quantity"
                  type="number"
                  min="0"
                  required
                  value={menuFormData.stock_quantity}
                  onChange={(e) => setMenuFormData({ ...menuFormData, stock_quantity: e.target.value })}
                />
                <Input
                  label="Low Stock Alert At"
                  type="number"
                  min="0"
                  value={menuFormData.low_stock_threshold}
                  onChange={(e) => setMenuFormData({ ...menuFormData, low_stock_threshold: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="secondary" fullWidth disabled={savingMenuItem} onClick={closeMenuForm}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={savingMenuItem}>
              {editingMenuItem ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>

      <MediaPicker
        isOpen={menuImagePickerOpen}
        onClose={() => setMenuImagePickerOpen(false)}
        onSelect={(url) => setMenuFormData((prev) => ({ ...prev, image: url }))}
        folder="menu-items"
      />

      {/* Table form */}
      <Modal open={tableFormOpen} onClose={closeTableForm} title={editingTable ? 'Edit Table' : 'Add Table'} size="md">
        <form onSubmit={handleTableSubmit} className="space-y-4">
          <Input
            label="Table Number"
            type="text"
            required
            value={tableFormData.table_number}
            onChange={(e) => setTableFormData({ ...tableFormData, table_number: e.target.value })}
          />
          <Input
            label="Capacity"
            type="number"
            required
            min="1"
            value={tableFormData.capacity}
            onChange={(e) => setTableFormData({ ...tableFormData, capacity: e.target.value })}
          />
          {editingTable && (
            <Select
              label="Status"
              value={tableFormData.status}
              onChange={(e) => setTableFormData({ ...tableFormData, status: e.target.value })}
            >
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
            </Select>
          )}
          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="secondary" fullWidth disabled={savingTable} onClick={closeTableForm}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={savingTable}>
              {editingTable ? 'Update Table' : 'Add Table'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* New order form */}
      <Modal open={orderFormOpen} onClose={closeOrderForm} title="New Order" size="xl">
        <form onSubmit={handleOrderSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Order Type"
              value={orderFormData.order_type}
              onChange={(e) => setOrderFormData({ ...orderFormData, order_type: e.target.value, table_id: '' })}
            >
              <option value="dine_in">Dine-in</option>
              <option value="room_service">Room Service</option>
              <option value="takeaway">Takeaway</option>
            </Select>
            {orderFormData.order_type === 'dine_in' && (
              <Select
                label="Table"
                value={orderFormData.table_id}
                onChange={(e) => setOrderFormData({ ...orderFormData, table_id: e.target.value })}
              >
                <option value="">Select a table</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>Table {t.table_number} ({t.status})</option>
                ))}
              </Select>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">Menu Items</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto border border-neutral-100 rounded-lg p-2">
              {menuItems.filter((m) => m.is_available).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => addOrderLine(item.id)}
                  className="flex items-center justify-between text-left px-3 py-2 rounded-lg hover:bg-primary-50 border border-neutral-100"
                >
                  <span className="text-sm text-neutral-800">{item.name}</span>
                  <span className="text-sm font-medium text-neutral-500">${Number(item.price).toFixed(2)}</span>
                </button>
              ))}
              {menuItems.filter((m) => m.is_available).length === 0 && (
                <p className="col-span-full text-center text-sm text-neutral-500 py-4">No available menu items.</p>
              )}
            </div>
          </div>

          {orderFormData.items.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">Order Summary</p>
              {orderFormData.items.map((line) => {
                const item = menuItems.find((m) => m.id === line.menu_item_id);
                if (!item) return null;
                return (
                  <div key={line.menu_item_id} className="flex items-center justify-between text-sm">
                    <span>{item.name}</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => changeOrderLineQty(line.menu_item_id, line.quantity - 1)} className="w-6 h-6 rounded bg-neutral-100 hover:bg-neutral-200">-</button>
                      <span className="w-6 text-center">{line.quantity}</span>
                      <button type="button" onClick={() => changeOrderLineQty(line.menu_item_id, line.quantity + 1)} className="w-6 h-6 rounded bg-neutral-100 hover:bg-neutral-200">+</button>
                      <span className="w-16 text-right font-medium">${(item.price * line.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between font-semibold pt-2 border-t border-neutral-100">
                <span>Total</span>
                <span>${orderTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <Textarea
            label="Notes (optional)"
            rows={2}
            value={orderFormData.notes}
            onChange={(e) => setOrderFormData({ ...orderFormData, notes: e.target.value })}
          />

          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="secondary" fullWidth disabled={savingOrder} onClick={closeOrderForm}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={savingOrder}>
              Place Order
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VendorRestaurant;
