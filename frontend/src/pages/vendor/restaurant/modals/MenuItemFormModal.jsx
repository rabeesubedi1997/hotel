import { useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { Button, Input, Modal, Select, Textarea } from '../../../../components/ui';
import MediaPicker from '../../../../components/MediaPicker';
import { vendorAPI } from '../../../../services/api';
import { useRestaurant } from '../context/RestaurantContext';
import { ALLERGEN_OPTIONS, CATEGORY_LABELS, STATION_OPTIONS, emptyMenuForm } from '../constants';

/**
 * Add/Edit menu item form. Extracted verbatim from the old Restaurant.jsx
 * monolith — same payload shape (track_inventory is a form-only field,
 * stripped before submit and translated into a null-vs-number stock_quantity).
 */
const MenuItemFormModal = ({ open, editingItem, onClose, menuCategories }) => {
  const { ownerType, ownerId, setMenuItems, toast } = useRestaurant();
  const [menuFormData, setMenuFormData] = useState(() => toFormData(editingItem));
  const [saving, setSaving] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);

  // Re-seed local form state whenever the modal is (re)opened for a
  // different item — Modal stays mounted, so this can't rely on key/props alone.
  const [lastEditingId, setLastEditingId] = useState(editingItem?.id ?? null);
  if (open && editingItem?.id !== lastEditingId) {
    setLastEditingId(editingItem?.id ?? null);
    setMenuFormData(toFormData(editingItem));
  }

  const toggleAllergen = (allergen) => {
    setMenuFormData((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter((a) => a !== allergen)
        : [...prev.allergens, allergen],
    }));
  };

  const close = () => {
    onClose();
    setMenuFormData(emptyMenuForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
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
      if (editingItem) {
        const response = await vendorAPI.updateMenuItem(editingItem.id, payload);
        setMenuItems((prev) => prev.map((m) => (m.id === editingItem.id ? response.data.item : m)));
        toast.success('Menu item updated!');
      } else {
        const response = await vendorAPI.createMenuItem(ownerType, ownerId, payload);
        setMenuItems((prev) => [response.data.item, ...prev]);
        toast.success('Menu item added!');
      }
      close();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save menu item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={close} title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Button type="button" variant="secondary" onClick={() => setImagePickerOpen(true)}>
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
            <Button type="button" variant="secondary" fullWidth disabled={saving} onClick={close}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={saving}>
              {editingItem ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>

      <MediaPicker
        isOpen={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={(url) => setMenuFormData((prev) => ({ ...prev, image: url }))}
        folder="menu-items"
      />
    </>
  );
};

const toFormData = (item) => item
  ? {
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
    }
  : emptyMenuForm;

export default MenuItemFormModal;
