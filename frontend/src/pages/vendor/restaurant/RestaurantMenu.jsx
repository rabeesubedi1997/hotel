import { useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, CheckSquare, Download, Edit, Image as ImageIcon, Plus, Search,
  Settings2, Square, Tags, Trash2, UtensilsCrossed, X, XCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { vendorAPI } from '../../../services/api';
import { useRestaurant } from './context/RestaurantContext';
import { CATEGORY_LABELS, STATION_LABEL } from './constants';
import MenuItemFormModal from './modals/MenuItemFormModal';
import CategoryManagerModal from './modals/CategoryManagerModal';
import InventorySettingsModal from './modals/InventorySettingsModal';

const RestaurantMenu = () => {
  const { ownerType, ownerId, owner, menuItems, setMenuItems, categories, isApproved, toast } = useRestaurant();

  const [menuFormOpen, setMenuFormOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('all');
  const [menuStockFilter, setMenuStockFilter] = useState('all');

  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [inventorySettingsOpen, setInventorySettingsOpen] = useState(false);

  const [bulk86Mode, setBulk86Mode] = useState(false);
  const [selectedMenuIds, setSelectedMenuIds] = useState(() => new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  const openAddMenuForm = () => {
    setEditingMenuItem(null);
    setMenuFormOpen(true);
  };

  const openEditMenuForm = (item) => {
    setEditingMenuItem(item);
    setMenuFormOpen(true);
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
    link.download = `menu-${owner?.name?.toLowerCase().replace(/\s+/g, '-') || ownerId}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
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

      <MenuItemFormModal
        open={menuFormOpen}
        editingItem={editingMenuItem}
        onClose={() => setMenuFormOpen(false)}
        menuCategories={menuCategories}
      />
      <CategoryManagerModal open={categoryManagerOpen} onClose={() => setCategoryManagerOpen(false)} />
      <InventorySettingsModal open={inventorySettingsOpen} onClose={() => setInventorySettingsOpen(false)} />
    </div>
  );
};

export default RestaurantMenu;
