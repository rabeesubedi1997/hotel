import { useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button, Modal } from '../../../../components/ui';
import { vendorAPI } from '../../../../services/api';
import { useRestaurant } from '../context/RestaurantContext';

/**
 * Menu category manager (add/rename/reorder/delete) — extracted verbatim
 * from the old Restaurant.jsx monolith.
 */
const CategoryManagerModal = ({ open, onClose }) => {
  const { ownerType, ownerId, categories, setCategories, menuItems, setMenuItems, toast } = useRestaurant();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryEdits, setCategoryEdits] = useState({});

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

  return (
    <Modal open={open} onClose={onClose} title="Category Manager" size="md">
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
  );
};

export default CategoryManagerModal;
