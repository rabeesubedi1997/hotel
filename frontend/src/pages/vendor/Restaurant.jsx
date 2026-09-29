import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Loader2, ArrowLeft, ChefHat, UtensilsCrossed, Grid3x3,
  Image as ImageIcon, X, BarChart3, AlertTriangle, Search, Users, DollarSign,
  Receipt, Wallet, CheckCircle2, XCircle, Circle, ShoppingBag, BedDouble, Timer,
  Flame, Download, Tags, CheckSquare, Square, Printer, GripVertical, Settings2,
} from 'lucide-react';
import { vendorAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Textarea, Select, Modal, Badge, StatCard } from '../../components/ui';
import MediaPicker from '../../components/MediaPicker';

const CATEGORY_LABELS = {
  starter: 'Starter',
  main_course: 'Main Course',
  dessert: 'Dessert',
  beverage: 'Beverage',
};

const ORDER_TYPE_ICON = {
  dine_in: UtensilsCrossed,
  room_service: BedDouble,
  takeaway: ShoppingBag,
};

const STATION_OPTIONS = [
  { value: 'grill', label: 'Grill Line' },
  { value: 'saute', label: 'Sauté / Expo' },
  { value: 'pizza', label: 'Woodfire Pizza' },
  { value: 'cold', label: 'Cold / Raw Bar' },
  { value: 'pastry', label: 'Pastry / Dessert' },
  { value: 'bar', label: 'Service Bar' },
];
const STATION_LABEL = Object.fromEntries(STATION_OPTIONS.map((s) => [s.value, s.label]));

const ALLERGEN_OPTIONS = ['gluten', 'dairy', 'nuts', 'shellfish', 'egg', 'soy'];

const CHANNEL_LABEL = { direct: 'Direct / POS', uber_eats: 'UberEats', doordash: 'DoorDash' };

// Kitchen tickets that sit this long without moving get flagged as running late.
const RUSH_THRESHOLD_MINUTES = 20;

const REPORT_PRESETS = [
  { key: 'today', label: 'Today', days: 0 },
  { key: '7d', label: '7 Days', days: 6 },
  { key: '30d', label: '30 Days', days: 29 },
  { key: '90d', label: '90 Days', days: 89 },
];

const emptyMenuForm = {
  name: '',
  description: '',
  price: '',
  cost_price: '',
  category: 'main_course',
  sku: '',
  station: '',
  allergens: [],
  prep_time_minutes: '',
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
  channel: 'direct',
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

const ACTION_LABEL = {
  pending: 'Accept Order',
  confirmed: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Mark Served',
  served: 'Complete Order',
};

const KITCHEN_COLUMNS = ['pending', 'confirmed', 'preparing', 'ready', 'served'];

const ITEM_STATUS_LABEL = { pending: 'Pending', preparing: 'Preparing', ready: 'Ready', served: 'Served' };
const ITEM_NEXT_STATUS = { pending: 'preparing', preparing: 'ready', ready: 'served', served: null };

// Kitchen-realistic urgency: how long an order has sat since it was placed,
// color-coded the way a real KDS flags tickets that are running late.
const elapsedMinutes = (order, now) => Math.max(0, Math.floor((now - new Date(order.created_at).getTime()) / 60000));
// Ticket header bar color — bolder than the small elapsed-time badge, so a
// cook can spot a running-late order from across the pass at a glance.
const urgencyBarClass = (minutes, done) => {
  if (done) return 'bg-primary-600 text-white';
  if (minutes >= 20) return 'bg-red-600 text-white';
  if (minutes >= 10) return 'bg-amber-500 text-white';
  return 'bg-neutral-800 text-white';
};

const VendorRestaurant = () => {
  const { hotelId, activityId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  // Restaurant POS is owned by either a hotel or an activity — same page,
  // same API shape, just a different owner id/type depending on which
  // route rendered it.
  const ownerType = activityId ? 'activity' : 'hotel';
  const ownerId = activityId || hotelId;
  const backLink = ownerType === 'activity' ? '/vendor/activities' : '/vendor/hotels';

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('kitchen');

  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);

  const [menuFormOpen, setMenuFormOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [menuFormData, setMenuFormData] = useState(emptyMenuForm);
  const [savingMenuItem, setSavingMenuItem] = useState(false);
  const [menuImagePickerOpen, setMenuImagePickerOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('all');
  const [menuStockFilter, setMenuStockFilter] = useState('all');

  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryEdits, setCategoryEdits] = useState({});

  const [bulk86Mode, setBulk86Mode] = useState(false);
  const [selectedMenuIds, setSelectedMenuIds] = useState(() => new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  const [inventorySettingsOpen, setInventorySettingsOpen] = useState(false);
  const [savingInventorySettings, setSavingInventorySettings] = useState(false);

  const [kitchenTypeFilter, setKitchenTypeFilter] = useState('all');

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
      const getOwner = ownerType === 'activity' ? vendorAPI.getActivity : vendorAPI.getHotel;
      const [ownerRes, menuRes, tablesRes, ordersRes, categoriesRes] = await Promise.all([
        getOwner(ownerId),
        vendorAPI.getMenuItems(ownerType, ownerId),
        vendorAPI.getTables(ownerType, ownerId),
        vendorAPI.getOrders(ownerType, ownerId),
        vendorAPI.getMenuCategories(ownerType, ownerId),
      ]);
      setHotel(ownerRes.data);
      setMenuItems(menuRes.data || []);
      setTables(tablesRes.data || []);
      setOrders(ordersRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Failed to load restaurant data', error);
      toast.error('Failed to load restaurant data');
    } finally {
      setLoading(false);
    }
  }, [ownerType, ownerId]);

  useEffect(() => {
    loadAll();
    const interval = setInterval(() => {
      vendorAPI.getOrders(ownerType, ownerId).then((res) => setOrders(res.data || [])).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAll, ownerType, ownerId]);

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
    if (tab === 'reports') {
      loadReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const applyReportPreset = (days) => {
    const to = new Date();
    const from = new Date(Date.now() - days * 86400000);
    setReportFrom(from.toISOString().slice(0, 10));
    setReportTo(to.toISOString().slice(0, 10));
  };

  useEffect(() => {
    if (tab === 'reports') loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportFrom, reportTo]);

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
      cost_price: item.cost_price ?? '',
      category: item.category || 'main_course',
      sku: item.sku || '',
      station: item.station || '',
      allergens: item.allergens || [],
      prep_time_minutes: item.prep_time_minutes ?? '',
      image: item.image || '',
      is_available: !!item.is_available,
      track_inventory: item.stock_quantity !== null && item.stock_quantity !== undefined,
      stock_quantity: item.stock_quantity ?? '',
      low_stock_threshold: item.low_stock_threshold ?? 5,
    });
    setMenuFormOpen(true);
  };

  const toggleAllergen = (allergen) => {
    setMenuFormData((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter((a) => a !== allergen)
        : [...prev.allergens, allergen],
    }));
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
      cost_price: menuFormData.cost_price === '' ? null : Number(menuFormData.cost_price),
      prep_time_minutes: menuFormData.prep_time_minutes === '' ? null : Number(menuFormData.prep_time_minutes),
      sku: menuFormData.sku || null,
      station: menuFormData.station || null,
      stock_quantity: track_inventory ? Number(menuFormData.stock_quantity || 0) : null,
    };
    try {
      if (editingMenuItem) {
        const response = await vendorAPI.updateMenuItem(editingMenuItem.id, payload);
        setMenuItems((prev) => prev.map((m) => (m.id === editingMenuItem.id ? response.data.item : m)));
        toast.success('Menu item updated!');
      } else {
        const response = await vendorAPI.createMenuItem(ownerType, ownerId, payload);
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

  // Quick one-click availability toggle, mirrors the table status pattern —
  // 86ing an item at the counter shouldn't require opening the full edit form.
  const toggleMenuAvailability = async (item) => {
    try {
      const response = await vendorAPI.updateMenuItem(item.id, { is_available: !item.is_available });
      setMenuItems((prev) => prev.map((m) => (m.id === item.id ? response.data.item : m)));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update availability');
    }
  };

  // Category pills follow the managed sort order from Category Manager;
  // any legacy free-text category not yet formalized there still shows up
  // (alphabetically, after the managed ones) so no item silently disappears.
  const menuCategories = useMemo(() => {
    const managedNames = categories.map((c) => c.name);
    const managedSet = new Set(managedNames);
    const unmanaged = Array.from(new Set(menuItems.map((m) => m.category))).filter((c) => !managedSet.has(c)).sort();
    return [...managedNames, ...unmanaged];
  }, [categories, menuItems]);

  const filteredMenuItems = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesCategory = menuCategoryFilter === 'all' || item.category === menuCategoryFilter;
      const matchesSearch = !q
        || item.name.toLowerCase().includes(q)
        || (item.description || '').toLowerCase().includes(q);
      const isLowStock = item.stock_quantity !== null && item.stock_quantity !== undefined && item.stock_quantity <= item.low_stock_threshold;
      const matchesStock = menuStockFilter === 'all'
        || (menuStockFilter === 'available' && item.is_available)
        || (menuStockFilter === 'unavailable' && !item.is_available)
        || (menuStockFilter === 'low_stock' && isLowStock);
      return matchesCategory && matchesSearch && matchesStock;
    });
  }, [menuItems, menuSearch, menuCategoryFilter, menuStockFilter]);

  const menuItemsByCategory = useMemo(() => {
    const groups = new Map();
    filteredMenuItems.forEach((item) => {
      const key = item.category || 'main_course';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredMenuItems]);

  // --- Menu categories ---
  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setSavingCategory(true);
    try {
      const response = await vendorAPI.createMenuCategory(ownerType, ownerId, { name });
      setCategories((prev) => [...prev, response.data.category]);
      setNewCategoryName('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleRenameCategory = async (category) => {
    const name = (categoryEdits[category.id] ?? category.name).trim();
    if (!name || name === category.name) return;
    try {
      const response = await vendorAPI.updateMenuCategory(category.id, { name });
      setCategories((prev) => prev.map((c) => (c.id === category.id ? response.data.category : c)));
      setMenuItems((prev) => prev.map((m) => (m.category === category.name ? { ...m, category: name } : m)));
      toast.success('Category renamed');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to rename category');
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    try {
      await vendorAPI.deleteMenuCategory(category.id);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  const moveCategory = async (index, direction) => {
    const next = [...categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next);
    try {
      await vendorAPI.reorderMenuCategories(ownerType, ownerId, next.map((c) => c.id));
    } catch (error) {
      toast.error('Failed to save new order');
    }
  };

  // --- Inventory settings (when stock decrements) ---
  const updateStockDeductionMode = async (mode) => {
    setSavingInventorySettings(true);
    try {
      await vendorAPI.updateInventorySettings(ownerType, ownerId, { stock_deduction_mode: mode });
      setHotel((prev) => ({ ...prev, stock_deduction_mode: mode }));
      toast.success('Inventory settings updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update inventory settings');
    } finally {
      setSavingInventorySettings(false);
    }
  };

  // --- Bulk 86 mode ---
  const toggleBulkSelection = (itemId) => {
    setSelectedMenuIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const exitBulkMode = () => {
    setBulk86Mode(false);
    setSelectedMenuIds(new Set());
  };

  const applyBulkAvailability = async (isAvailable) => {
    if (selectedMenuIds.size === 0) return;
    setBulkSaving(true);
    try {
      const ids = Array.from(selectedMenuIds);
      const response = await vendorAPI.bulkUpdateMenuAvailability(ownerType, ownerId, { ids, is_available: isAvailable });
      const updatedById = new Map(response.data.items.map((i) => [i.id, i]));
      setMenuItems((prev) => prev.map((m) => updatedById.get(m.id) || m));
      toast.success(response.data.message);
      exitBulkMode();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk update failed');
    } finally {
      setBulkSaving(false);
    }
  };

  // --- CSV export (client-side — the data's already loaded, no need for a
  // dedicated backend export endpoint) ---
  const exportMenuCsv = () => {
    const header = ['Name', 'Category', 'SKU', 'Station', 'Price', 'Cost', 'Margin %', 'Stock', 'Available', 'Allergens'];
    const rows = filteredMenuItems.map((item) => [
      item.name,
      item.category,
      item.sku || '',
      item.station ? (STATION_LABEL[item.station] || item.station) : '',
      Number(item.price).toFixed(2),
      item.cost_price !== null && item.cost_price !== undefined ? Number(item.cost_price).toFixed(2) : '',
      item.margin_percent !== null && item.margin_percent !== undefined ? `${item.margin_percent}%` : '',
      item.stock_quantity === null ? 'Not tracked' : item.stock_quantity,
      item.is_available ? 'Yes' : 'No',
      (item.allergens || []).join('; '),
    ]);
    const escapeCsv = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `menu-${hotel?.name?.toLowerCase().replace(/\s+/g, '-') || ownerId}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
        const response = await vendorAPI.createTable(ownerType, ownerId, tableFormData);
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
        channel: orderFormData.channel,
        notes: orderFormData.notes || undefined,
        table_id: orderFormData.order_type === 'dine_in' && orderFormData.table_id ? orderFormData.table_id : undefined,
        items: orderFormData.items,
      };
      const response = await vendorAPI.createOrder(ownerType, ownerId, payload);
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

  const toggleRush = async (order) => {
    try {
      const response = await vendorAPI.updateOrderRush(order.id, !order.is_rush);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? response.data.order : o)));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update rush flag');
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

  const kitchenOrders = useMemo(
    () => (kitchenTypeFilter === 'all' ? orders : orders.filter((o) => o.order_type === kitchenTypeFilter)),
    [orders, kitchenTypeFilter]
  );

  const activeKitchenOrders = useMemo(
    () => kitchenOrders.filter((o) => !['completed', 'cancelled'].includes(o.status)),
    [kitchenOrders]
  );

  const avgTicketMinutes = useMemo(() => {
    if (activeKitchenOrders.length === 0) return 0;
    const total = activeKitchenOrders.reduce((sum, o) => sum + elapsedMinutes(o, now), 0);
    return Math.round(total / activeKitchenOrders.length);
  }, [activeKitchenOrders, now]);

  const delayedOrders = useMemo(
    () => activeKitchenOrders.filter((o) => o.is_rush || elapsedMinutes(o, now) >= RUSH_THRESHOLD_MINUTES),
    [activeKitchenOrders, now]
  );

  const mostDelayedOrder = useMemo(() => {
    if (delayedOrders.length === 0) return null;
    return [...delayedOrders].sort((a, b) => elapsedMinutes(b, now) - elapsedMinutes(a, now))[0];
  }, [delayedOrders, now]);

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

  const [expandedOrderId, setExpandedOrderId] = useState(null);

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
      <button
        onClick={() => navigate(backLink)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 mb-3 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {ownerType === 'activity' ? 'My Activities' : 'My Hotels'}
      </button>
      <h2 className="font-display text-2xl font-bold text-neutral-900 mb-2">
        Restaurant POS {hotel ? `— ${hotel.name}` : ''}
      </h2>

      {!isApproved && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 mb-4">
          This {ownerType} is pending admin verification — menu, table, and order changes unlock once it&apos;s approved. You can still view existing data below.
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { key: 'all', label: 'All' },
                { key: 'dine_in', label: 'Dine-in' },
                { key: 'room_service', label: 'Room Service' },
                { key: 'takeaway', label: 'Takeaway' },
              ].map((f) => (
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
            <Button size="sm" onClick={openNewOrder} disabled={!isApproved}>
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </div>

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
                  {columnOrders.map((order) => {
                    const minutes = elapsedMinutes(order, now);
                    const readyCount = order.items?.filter((i) => ['ready', 'served'].includes(i.status)).length || 0;
                    const itemCount = order.items?.length || 0;
                    const activeTracking = !['served', 'completed', 'cancelled'].includes(order.status);
                    const TypeIcon = ORDER_TYPE_ICON[order.order_type] || UtensilsCrossed;
                    return (
                      <div key={order.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col ${order.is_rush ? 'border-red-300 ring-1 ring-red-200' : 'border-neutral-100'}`}>
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
                                    onClick={() => activeTracking && toggleItemStatus(order, line)}
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
                              onClick={() => advanceOrder(order)}
                              className="w-full text-xs font-bold uppercase tracking-wide bg-primary-600 text-white rounded-lg py-2.5 hover:bg-primary-700 transition-colors"
                            >
                              {ACTION_LABEL[order.status]}
                            </button>
                          )}
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            {activeTracking && (
                              <button
                                onClick={() => toggleRush(order)}
                                className={`flex items-center justify-center gap-1 text-xs font-medium rounded-lg py-1.5 ${
                                  order.is_rush ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'text-neutral-600 hover:bg-neutral-100'
                                }`}
                              >
                                <Flame className="h-3.5 w-3.5" /> {order.is_rush ? 'Unflag Rush' : 'Mark Rush'}
                              </button>
                            )}
                            <button
                              onClick={() => printChit(order)}
                              className="flex items-center justify-center gap-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg py-1.5"
                            >
                              <Printer className="h-3.5 w-3.5" /> Print
                            </button>
                          </div>
                          {activeTracking && (
                            <button
                              onClick={() => cancelOrder(order)}
                              className="w-full text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg py-1.5 mt-1"
                            >
                              Cancel Order
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {columnOrders.length === 0 && (
                    <p className="text-xs text-neutral-400 text-center py-4">No orders</p>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'menu' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder="Search dish name or description..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex-1" />
            <Button size="sm" variant="secondary" onClick={exportMenuCsv} disabled={menuItems.length === 0}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              size="sm"
              variant={bulk86Mode ? 'danger' : 'secondary'}
              onClick={() => (bulk86Mode ? exitBulkMode() : setBulk86Mode(true))}
              disabled={!isApproved}
            >
              {bulk86Mode ? <X className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {bulk86Mode ? 'Exit Bulk Mode' : "Bulk 86' Mode"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCategoryManagerOpen(true)} disabled={!isApproved}>
              <Tags className="h-4 w-4" />
              Category Manager
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setInventorySettingsOpen(true)} disabled={!isApproved}>
              <Settings2 className="h-4 w-4" />
              Inventory Settings
            </Button>
            <Button size="sm" onClick={openAddMenuForm} disabled={!isApproved}>
              <Plus className="h-4 w-4" />
              Add Menu Item
            </Button>
          </div>

          {bulk86Mode && (
            <div className="flex items-center justify-between gap-3 bg-neutral-900 text-white rounded-xl px-4 py-3 mb-4">
              <span className="text-sm font-medium">{selectedMenuIds.size} item(s) selected</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => applyBulkAvailability(false)}
                  disabled={selectedMenuIds.size === 0 || bulkSaving}
                  className="text-xs font-bold uppercase tracking-wide bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-3 py-2"
                >
                  86 Selected
                </button>
                <button
                  onClick={() => applyBulkAvailability(true)}
                  disabled={selectedMenuIds.size === 0 || bulkSaving}
                  className="text-xs font-bold uppercase tracking-wide bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-3 py-2"
                >
                  Restore Selected
                </button>
                <button onClick={exitBulkMode} className="text-xs font-medium text-neutral-300 hover:text-white px-2">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {menuItems.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2 -mx-1 px-1">
              <button
                type="button"
                onClick={() => setMenuCategoryFilter('all')}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide transition-colors ${
                  menuCategoryFilter === 'all' ? 'bg-primary-600 text-white shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                All Items
                <span className={`px-1.5 rounded text-xs font-bold ${menuCategoryFilter === 'all' ? 'bg-white/20' : 'bg-white text-neutral-500'}`}>
                  {menuItems.length}
                </span>
              </button>
              {menuCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setMenuCategoryFilter(cat)}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide transition-colors ${
                    menuCategoryFilter === cat ? 'bg-primary-600 text-white shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {CATEGORY_LABELS[cat] || cat.replace('_', ' ')}
                  <span className={`px-1.5 rounded text-xs font-bold ${menuCategoryFilter === cat ? 'bg-white/20' : 'bg-white text-neutral-500'}`}>
                    {menuItems.filter((m) => m.category === cat).length}
                  </span>
                </button>
              ))}
            </div>
          )}

          {menuItems.length > 0 && (() => {
            const stockTiles = [
              { key: 'all', label: 'Total Items', icon: UtensilsCrossed, value: menuItems.length, tone: 'bg-primary-500', tint: 'bg-primary-50 text-primary-700 ring-primary-200' },
              { key: 'available', label: 'Available', icon: CheckCircle2, value: menuItems.filter((m) => m.is_available).length, tone: 'bg-green-500', tint: 'bg-green-50 text-green-700 ring-green-200' },
              { key: 'unavailable', label: 'Unavailable', icon: XCircle, value: menuItems.filter((m) => !m.is_available).length, tone: 'bg-neutral-700', tint: 'bg-neutral-100 text-neutral-700 ring-neutral-300' },
              {
                key: 'low_stock',
                label: 'Low Stock',
                icon: AlertTriangle,
                value: menuItems.filter((m) => m.stock_quantity !== null && m.stock_quantity !== undefined && m.stock_quantity <= m.low_stock_threshold).length,
                tone: 'bg-amber-500',
                tint: 'bg-amber-50 text-amber-700 ring-amber-200',
              },
            ];
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {stockTiles.map((tile) => {
                  const isActive = menuStockFilter === tile.key;
                  const Icon = tile.icon;
                  return (
                    <button
                      key={tile.key}
                      type="button"
                      onClick={() => setMenuStockFilter(isActive ? 'all' : tile.key)}
                      className={`text-left bg-white rounded-2xl shadow-card p-4 flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:shadow-card-hover ${
                        isActive ? `ring-2 ${tile.tint.split(' ').pop()}` : 'ring-1 ring-transparent'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl ${tile.tone} shrink-0`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-neutral-500 truncate">{tile.label}</p>
                        <p className="font-display text-xl font-bold text-neutral-900">{tile.value}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {menuStockFilter !== 'all' && (
            <div className="flex items-center gap-2 mb-4 -mt-3">
              <span className="text-xs text-neutral-500">
                Filtered to <strong className="text-neutral-700">{menuStockFilter.replace('_', ' ')}</strong> items
              </span>
              <button
                type="button"
                onClick={() => setMenuStockFilter('all')}
                className="text-xs font-medium text-primary-600 hover:text-primary-800"
              >
                Clear
              </button>
            </div>
          )}

          {menuItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-neutral-200 py-16 text-center">
              <UtensilsCrossed className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500 mb-4">No menu items yet. Build out your menu to start taking orders.</p>
              <Button size="sm" onClick={openAddMenuForm} disabled={!isApproved} className="mx-auto">
                <Plus className="h-4 w-4" />
                Add Your First Item
              </Button>
            </div>
          ) : filteredMenuItems.length === 0 ? (
            <p className="text-center text-neutral-500 py-12">No items match your search.</p>
          ) : (
            <div className="space-y-8">
              {menuItemsByCategory.map(([category, items]) => (
                <div key={category}>
                  {menuCategoryFilter === 'all' && (
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-display text-lg font-bold text-neutral-900">
                        {CATEGORY_LABELS[category] || category.replace('_', ' ')}
                      </h3>
                      <span className="text-xs text-neutral-400 font-medium">{items.length}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => bulk86Mode && toggleBulkSelection(item.id)}
                        className={`bg-white rounded-2xl border shadow-card overflow-hidden flex flex-col ${
                          bulk86Mode ? 'cursor-pointer' : ''
                        } ${
                          selectedMenuIds.has(item.id) ? 'border-primary-500 ring-2 ring-primary-200' : 'border-neutral-100'
                        } ${item.is_available ? '' : 'opacity-60'}`}
                      >
                        <div className="relative h-36 bg-neutral-100">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-neutral-300" />
                            </div>
                          )}
                          {bulk86Mode && (
                            <span className="absolute top-2 left-2 bg-white rounded-md shadow">
                              {selectedMenuIds.has(item.id)
                                ? <CheckSquare className="h-6 w-6 text-primary-600" />
                                : <Square className="h-6 w-6 text-neutral-400" />}
                            </span>
                          )}
                          {item.station && !bulk86Mode && (
                            <span className="absolute bottom-0 right-0 bg-neutral-900/80 text-white text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5">
                              {STATION_LABEL[item.station] || item.station}
                            </span>
                          )}
                          <span className="absolute top-2 right-2 bg-white/95 text-neutral-900 text-sm font-bold px-2 py-1 rounded-lg shadow-sm">
                            ${Number(item.price).toFixed(2)}
                          </span>
                          {!bulk86Mode && item.stock_quantity !== null && item.stock_quantity <= item.low_stock_threshold && (
                            <span className="absolute top-9 left-2 inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                              <AlertTriangle className="h-3 w-3" />
                              Low stock
                            </span>
                          )}
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <h4 className="font-semibold text-neutral-900">{item.name}</h4>
                            {item.sku && <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">{item.sku}</span>}
                          </div>
                          {item.description && (
                            <p className="text-sm text-neutral-500 line-clamp-2 mb-2">{item.description}</p>
                          )}
                          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                            {item.cost_price !== null && item.cost_price !== undefined ? (
                              <span>Cost ${Number(item.cost_price).toFixed(2)} ({item.margin_percent}% margin)</span>
                            ) : <span />}
                            {item.prep_time_minutes !== null && item.prep_time_minutes !== undefined && (
                              <span>{item.prep_time_minutes}m prep</span>
                            )}
                          </div>
                          {item.allergens?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {item.allergens.map((a) => (
                                <span key={a} className="text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                                  {a}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mt-auto pt-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleMenuAvailability(item); }}
                              disabled={!isApproved || bulk86Mode}
                              title={item.is_available ? 'Click to 86 this item' : 'Click to bring back in stock'}
                              className={`w-full flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wide rounded-lg py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                item.is_available
                                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                  : 'bg-red-600 text-white hover:bg-red-700'
                              }`}
                            >
                              {item.is_available ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                              {item.is_available
                                ? (item.stock_quantity === null ? 'Available' : `${item.stock_quantity} in stock`)
                                : "86'd — Sold Out"}
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditMenuForm(item); }}
                              disabled={!isApproved || bulk86Mode}
                              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-lg py-1.5 hover:bg-primary-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Edit className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMenuDelete(item.id); }}
                              disabled={!isApproved || bulk86Mode}
                              className="flex items-center justify-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg py-1.5 px-3 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-neutral-400 text-center">
                Showing {filteredMenuItems.length} of {menuItems.length} menu item(s)
              </p>
            </div>
          )}
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
                <div
                  key={table.id}
                  className={`bg-white rounded-2xl border shadow-card p-4 ${
                    table.status === 'occupied' ? 'border-amber-200' : table.status === 'reserved' ? 'border-secondary-200' : 'border-neutral-100'
                  }`}
                >
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
        </div>
      )}

      {tab === 'reports' && (
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
              {menuCategories.length === 0 && <option value="main_course">Main Course</option>}
              {menuCategories.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Cost Price ($)"
              type="number"
              min="0"
              step="0.01"
              value={menuFormData.cost_price}
              onChange={(e) => setMenuFormData({ ...menuFormData, cost_price: e.target.value })}
            />
            <Input
              label="SKU"
              type="text"
              value={menuFormData.sku}
              onChange={(e) => setMenuFormData({ ...menuFormData, sku: e.target.value })}
            />
            <Input
              label="Prep Time (min)"
              type="number"
              min="0"
              value={menuFormData.prep_time_minutes}
              onChange={(e) => setMenuFormData({ ...menuFormData, prep_time_minutes: e.target.value })}
            />
          </div>
          {menuFormData.price && menuFormData.cost_price !== '' && (
            <p className="text-xs text-neutral-500 -mt-2">
              Margin: {(((Number(menuFormData.price) - Number(menuFormData.cost_price)) / Number(menuFormData.price)) * 100).toFixed(1)}%
            </p>
          )}
          <Select
            label="Kitchen Station"
            value={menuFormData.station}
            onChange={(e) => setMenuFormData({ ...menuFormData, station: e.target.value })}
          >
            <option value="">Unassigned</option>
            {STATION_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Allergens</label>
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_OPTIONS.map((allergen) => (
                <button
                  key={allergen}
                  type="button"
                  onClick={() => toggleAllergen(allergen)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border transition-colors ${
                    menuFormData.allergens.includes(allergen)
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : 'bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  {allergen}
                </button>
              ))}
            </div>
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

      {/* Category Manager */}
      <Modal open={categoryManagerOpen} onClose={() => setCategoryManagerOpen(false)} title="Category Manager" size="md">
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
              placeholder="New category name..."
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Button size="sm" onClick={handleAddCategory} loading={savingCategory} disabled={!newCategoryName.trim()}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>

          {categories.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-6">
              No managed categories yet. Add one above, or keep using free-text categories on items.
            </p>
          ) : (
            <div className="space-y-2">
              {categories.map((category, index) => (
                <div key={category.id} className="flex items-center gap-2 bg-neutral-50 rounded-xl p-2">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveCategory(index, -1)}
                      disabled={index === 0}
                      className="text-neutral-400 hover:text-neutral-700 disabled:opacity-20"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={categoryEdits[category.id] ?? category.name}
                    onChange={(e) => setCategoryEdits((prev) => ({ ...prev, [category.id]: e.target.value }))}
                    onBlur={() => handleRenameCategory(category)}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    className="flex-1 bg-white px-3 py-1.5 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-xs text-neutral-400 shrink-0">
                    {menuItems.filter((m) => m.category === category.name).length} item(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => moveCategory(index, 1)}
                    disabled={index === categories.length - 1}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 disabled:opacity-20"
                    title="Move down"
                  >
                    <GripVertical className="h-4 w-4 rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(category)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Delete category"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-neutral-400">
            Renaming a category here updates every menu item using it. A category with items assigned cannot be deleted — reassign or delete those items first.
          </p>
        </div>
      </Modal>

      {/* Inventory Settings */}
      <Modal open={inventorySettingsOpen} onClose={() => setInventorySettingsOpen(false)} title="Inventory Settings" size="md">
        <div className="space-y-3">
          <p className="text-sm text-neutral-500">Choose when stock gets deducted for tracked items.</p>
          {[
            {
              value: 'on_order',
              label: 'When the order is placed',
              hint: 'Default — stock is reserved the moment a ticket hits the kitchen. Cancelling an order restores it.',
            },
            {
              value: 'on_complete',
              label: 'When the order is completed',
              hint: "Stock isn't touched until the order is marked Complete. Cancelling before then has nothing to restore.",
            },
          ].map((option) => {
            const isActive = (hotel?.stock_deduction_mode || 'on_order') === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={!isApproved || savingInventorySettings}
                onClick={() => updateStockDeductionMode(option.value)}
                className={`w-full text-left rounded-xl border p-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isActive ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isActive ? 'border-primary-600' : 'border-neutral-300'}`}>
                    {isActive && <span className="h-2 w-2 rounded-full bg-primary-600" />}
                  </span>
                  <span className="font-semibold text-neutral-900 text-sm">{option.label}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1 ml-6">{option.hint}</p>
              </button>
            );
          })}
        </div>
      </Modal>

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
            <Select
              label="Channel"
              value={orderFormData.channel}
              onChange={(e) => setOrderFormData({ ...orderFormData, channel: e.target.value })}
            >
              <option value="direct">Direct / POS</option>
              <option value="uber_eats">UberEats</option>
              <option value="doordash">DoorDash</option>
            </Select>
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
