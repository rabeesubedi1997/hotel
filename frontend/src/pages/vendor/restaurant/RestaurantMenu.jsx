import { useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, CheckSquare, Download, Edit, Image as ImageIcon, Plus, Search,
  Settings2, Square, Tags, Trash2, Upload, UtensilsCrossed, X, XCircle,
} from 'lucide-react';
import { Button, Table, Td, Th } from '../../../components/ui';
import { vendorAPI } from '../../../services/api';
import { useRestaurant } from './context/RestaurantContext';
import { CATEGORY_LABELS, STATION_LABEL } from './constants';
import MenuItemFormModal from './modals/MenuItemFormModal';
import CategoryManagerModal from './modals/CategoryManagerModal';
import InventorySettingsModal from './modals/InventorySettingsModal';
import ImportMenuModal from './modals/ImportMenuModal';

const RestaurantMenu = () => {
  const { ownerType, ownerId, owner, menuItems, setMenuItems, categories, isApproved, toast } = useRestaurant();

  const [menuFormOpen, setMenuFormOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('all');
  const [menuStockFilter, setMenuStockFilter] = useState('all');

  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [inventorySettingsOpen, setInventorySettingsOpen] = useState(false);
  const [importMenuOpen, setImportMenuOpen] = useState(false);

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

  const sortedMenuItems = useMemo(
    () => [...filteredMenuItems].sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name)),
    [filteredMenuItems]
  );

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
      <h2 className="font-display headline-sm text-on-surface mb-4">Menu</h2>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={menuSearch}
            onChange={(e) => setMenuSearch(e.target.value)}
            placeholder="Search dish name or description..."
            className="w-full pl-10 pr-3 py-2.5 text-body-sm rounded-full border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 transition-colors"
          />
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="secondary" onClick={exportMenuCsv} disabled={menuItems.length === 0}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setImportMenuOpen(true)} disabled={!isApproved}>
          <Upload className="h-4 w-4" />
          Import
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
        <div className="flex items-center justify-between gap-3 bg-on-surface text-white rounded-2xl px-5 py-3.5 mb-4 shadow-card">
          <span className="text-body-md font-medium">{selectedMenuIds.size} item(s) selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => applyBulkAvailability(false)}
              disabled={selectedMenuIds.size === 0 || bulkSaving}
              className="text-label-caps bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-full px-4 py-2 transition-colors"
            >
              86 Selected
            </button>
            <button
              onClick={() => applyBulkAvailability(true)}
              disabled={selectedMenuIds.size === 0 || bulkSaving}
              className="text-label-caps bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-full px-4 py-2 transition-colors"
            >
              Restore Selected
            </button>
            <button onClick={exitBulkMode} className="text-body-sm font-medium text-neutral-300 hover:text-white px-2">
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
        <div className="bg-white rounded-3xl border border-dashed border-neutral-200 py-16 text-center">
          <UtensilsCrossed className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500 mb-4">No menu items yet. Build out your menu to start taking orders.</p>
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" onClick={openAddMenuForm} disabled={!isApproved}>
              <Plus className="h-4 w-4" />
              Add Your First Item
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setImportMenuOpen(true)} disabled={!isApproved}>
              <Upload className="h-4 w-4" />
              Import from CSV
            </Button>
          </div>
        </div>
      ) : filteredMenuItems.length === 0 ? (
        <p className="text-center text-neutral-500 py-12">No items match your search.</p>
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                {bulk86Mode && <Th className="w-10" />}
                <Th>Item</Th>
                <Th>Category / Station</Th>
                <Th>Price</Th>
                <Th>Stock</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sortedMenuItems.map((item) => {
                const isLowStock = item.stock_quantity !== null && item.stock_quantity !== undefined && item.stock_quantity <= item.low_stock_threshold;
                return (
                  <tr
                    key={item.id}
                    onClick={() => bulk86Mode && toggleBulkSelection(item.id)}
                    className={`${bulk86Mode ? 'cursor-pointer' : ''} ${selectedMenuIds.has(item.id) ? 'bg-primary-50/60' : 'hover:bg-neutral-50/80'} ${item.is_available ? '' : 'opacity-60'} transition-colors`}
                  >
                    {bulk86Mode && (
                      <Td>
                        {selectedMenuIds.has(item.id)
                          ? <CheckSquare className="h-5 w-5 text-primary-600" />
                          : <Square className="h-5 w-5 text-neutral-300" />}
                      </Td>
                    )}
                    <Td className="whitespace-normal">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                          {item.image
                            ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                            : <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-5 w-5 text-neutral-300" /></div>}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-display font-semibold text-on-surface">{item.name}</span>
                            {item.sku && <span className="text-label-caps text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">{item.sku}</span>}
                          </div>
                          {item.description && <p className="text-body-sm text-neutral-500 line-clamp-1 max-w-xs">{item.description}</p>}
                          {item.allergens?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.allergens.map((a) => (
                                <span key={a} className="text-label-caps text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{a}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="text-body-sm text-on-surface capitalize">{CATEGORY_LABELS[item.category] || item.category?.replace('_', ' ')}</p>
                      {item.station && <p className="text-label-caps text-secondary-600 mt-0.5">{STATION_LABEL[item.station] || item.station}</p>}
                    </Td>
                    <Td>
                      <p className="font-display font-semibold text-on-surface">${Number(item.price).toFixed(2)}</p>
                      {item.cost_price !== null && item.cost_price !== undefined && (
                        <p className="text-label-caps text-neutral-400 mt-0.5">{item.margin_percent}% margin</p>
                      )}
                    </Td>
                    <Td>
                      {item.stock_quantity === null ? (
                        <span className="text-body-sm text-neutral-400">Not tracked</span>
                      ) : isLowStock ? (
                        <span className="flex items-center gap-1 text-body-sm font-medium text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" /> {item.stock_quantity} left
                        </span>
                      ) : (
                        <span className="text-body-sm text-on-surface">{item.stock_quantity} in stock</span>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleMenuAvailability(item); }}
                          disabled={!isApproved || bulk86Mode}
                          title={item.is_available ? 'Click to 86 this item' : 'Click to bring back in stock'}
                          className={`px-3 py-1.5 rounded-full text-label-caps transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            item.is_available ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {item.is_available ? 'Available' : "86'd"}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditMenuForm(item); }}
                          disabled={!isApproved || bulk86Mode}
                          className="p-2 rounded-full text-primary-700 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMenuDelete(item.id); }}
                          disabled={!isApproved || bulk86Mode}
                          className="p-2 rounded-full text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <p className="text-body-sm text-neutral-400 text-center mt-4">
            Showing {filteredMenuItems.length} of {menuItems.length} menu item(s)
          </p>
        </>
      )}

      <MenuItemFormModal
        open={menuFormOpen}
        editingItem={editingMenuItem}
        onClose={() => setMenuFormOpen(false)}
        menuCategories={menuCategories}
      />
      <CategoryManagerModal open={categoryManagerOpen} onClose={() => setCategoryManagerOpen(false)} />
      <InventorySettingsModal open={inventorySettingsOpen} onClose={() => setInventorySettingsOpen(false)} />
      <ImportMenuModal open={importMenuOpen} onClose={() => setImportMenuOpen(false)} />
    </div>
  );
};

export default RestaurantMenu;
