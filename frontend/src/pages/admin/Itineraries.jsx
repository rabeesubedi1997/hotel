import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  X,
  Image as ImageIcon,
  ListChecks,
  Hotel as HotelIcon,
  Compass,
  UserRound,
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import MediaPicker from '../../components/MediaPicker';
import useAuthStore from '../../stores/authStore';
import { Button, Input, Textarea, Select, Modal, Table, Th, Td, Badge, Pagination } from '../../components/ui';
import usePagination from '../../hooks/usePagination';

const emptyFormData = {
  title: '',
  description: '',
  cover_image: '',
  duration_days: 1,
  price_from: '',
  fixed_price: '',
  max_travelers: '',
  status: 'draft',
  is_public: false,
};

const BOOKABLE_BADGES = {
  hotel: { label: 'Hotel', tone: 'primary' },
  activity: { label: 'Activity', tone: 'accent' },
  tour_guide: { label: 'Tour Guide', tone: 'warning' },
};

const AdminItineraries = () => {
  const { user } = useAuthStore();
  const toast = useToast();

  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const { pagination, applyResponse, goToPage, setPerPage, resetToFirstPage } = usePagination();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Edit / Create modal
  const [editModal, setEditModal] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Manage Items modal
  const [itemsModal, setItemsModal] = useState(false);
  const [activeItinerary, setActiveItinerary] = useState(null);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Inline "add item" picker (opened for a single day at a time)
  const [addingToDay, setAddingToDay] = useState(null);
  const [pickerType, setPickerType] = useState('hotel');
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerResults, setPickerResults] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerAddingId, setPickerAddingId] = useState(null);

  const canManage = user && ['admin', 'manager', 'super_admin'].includes(user.role);

  const fetchItineraries = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getItineraries({
        page: pagination.current_page,
        per_page: pagination.per_page,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      setItineraries(response.data.data || []);
      applyResponse(response.data);
    } catch (error) {
      console.error('Error fetching itineraries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // A new search term always lands back on page 1 (a no-op if already there).
  useEffect(() => {
    resetToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    fetchItineraries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, debouncedSearch]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this itinerary?')) return;
    try {
      await adminAPI.deleteItinerary(id);
      setItineraries((prev) => prev.filter((itinerary) => itinerary.id !== id));
      toast.success('Itinerary deleted successfully!');
    } catch (error) {
      console.error('Error deleting itinerary:', error);
      toast.error('Failed to delete itinerary');
    }
  };

  const handleAddNew = () => {
    setEditingItinerary(null);
    setFormData(emptyFormData);
    setEditModal(true);
  };

  const openEditModal = (itinerary) => {
    setEditingItinerary(itinerary);
    setFormData({
      title: itinerary.title || '',
      description: itinerary.description || '',
      cover_image: itinerary.cover_image || '',
      duration_days: itinerary.duration_days || 1,
      price_from: itinerary.price_from ?? '',
      fixed_price: itinerary.fixed_price ?? '',
      max_travelers: itinerary.max_travelers ?? '',
      status: itinerary.status || 'draft',
      is_public: !!itinerary.is_public,
    });
    setEditModal(true);
  };

  const closeEditModal = () => {
    setEditModal(false);
    setEditingItinerary(null);
    setFormData(emptyFormData);
  };

  const handleImageSelect = (url) => {
    setFormData((prev) => ({ ...prev, cover_image: url }));
    setMediaPickerOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingItinerary) {
        const response = await adminAPI.updateItinerary(editingItinerary.id, formData);
        setItineraries((prev) =>
          prev.map((it) => (it.id === editingItinerary.id ? { ...it, ...response.data.itinerary } : it))
        );
        toast.success('Itinerary updated successfully!');
      } else {
        const response = await adminAPI.createItinerary(formData);
        setItineraries((prev) => [{ ...response.data.itinerary, items_count: 0 }, ...prev]);
        toast.success('Itinerary created successfully!');
      }
      closeEditModal();
    } catch (error) {
      console.error('Error saving itinerary:', error);
      toast.error('Failed to save itinerary');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------
  // Manage Items modal
  // ---------------------------------------------------------------------

  const openItemsModal = async (itinerary) => {
    setItemsModal(true);
    setActiveItinerary({ ...itinerary, items: [] });
    setItemsLoading(true);
    setAddingToDay(null);
    try {
      const response = await adminAPI.getItinerary(itinerary.id);
      setActiveItinerary(response.data);
    } catch (error) {
      console.error('Error loading itinerary items:', error);
      toast.error('Failed to load itinerary items');
    } finally {
      setItemsLoading(false);
    }
  };

  const closeItemsModal = () => {
    setItemsModal(false);
    setActiveItinerary(null);
    setAddingToDay(null);
    setPickerSearch('');
    setPickerResults([]);
  };

  const updateItemsCountInList = (itineraryId, delta) => {
    setItineraries((prev) =>
      prev.map((it) =>
        it.id === itineraryId
          ? { ...it, items_count: Math.max(0, (it.items_count || 0) + delta) }
          : it
      )
    );
  };

  const openPickerForDay = (day) => {
    setAddingToDay(day);
    setPickerType('hotel');
    setPickerSearch('');
    setPickerResults([]);
  };

  const closePicker = () => {
    setAddingToDay(null);
    setPickerSearch('');
    setPickerResults([]);
  };

  // Search the existing admin list endpoints for the currently selected type.
  useEffect(() => {
    if (addingToDay == null) return undefined;

    const timer = setTimeout(async () => {
      setPickerLoading(true);
      try {
        if (pickerType === 'hotel') {
          const response = await adminAPI.getHotels({ search: pickerSearch, per_page: 5 });
          setPickerResults(response.data.data || []);
        } else if (pickerType === 'activity') {
          const response = await adminAPI.getActivities({ search: pickerSearch, per_page: 5 });
          setPickerResults(response.data.data || []);
        } else {
          // Admin tour guides endpoint returns a plain (unpaginated) array
          // with no search param, so filter client-side.
          const response = await adminAPI.getTourGuides();
          const all = response.data || [];
          const term = pickerSearch.trim().toLowerCase();
          const filtered = term ? all.filter((g) => g.name.toLowerCase().includes(term)) : all;
          setPickerResults(filtered.slice(0, 5));
        }
      } catch (error) {
        console.error('Error searching bookable items:', error);
        toast.error('Failed to search items');
      } finally {
        setPickerLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerType, pickerSearch, addingToDay]);

  const handleAddItem = async (bookable) => {
    if (!activeItinerary || addingToDay == null) return;
    setPickerAddingId(bookable.id);
    try {
      const response = await adminAPI.addItineraryItem(activeItinerary.id, {
        bookable_type: pickerType,
        bookable_id: bookable.id,
        day_number: addingToDay,
      });
      setActiveItinerary((prev) => ({
        ...prev,
        items: [...(prev.items || []), response.data.item],
      }));
      updateItemsCountInList(activeItinerary.id, 1);
      toast.success('Item added to itinerary');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    } finally {
      setPickerAddingId(null);
    }
  };

  const handleRemoveItem = async (item) => {
    if (!activeItinerary) return;
    if (!window.confirm('Remove this item from the itinerary?')) return;
    try {
      await adminAPI.removeItineraryItem(activeItinerary.id, item.id);
      setActiveItinerary((prev) => ({
        ...prev,
        items: (prev.items || []).filter((i) => i.id !== item.id),
      }));
      updateItemsCountInList(activeItinerary.id, -1);
      toast.success('Item removed');
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove item');
    }
  };

  const getItemThumb = (item) => {
    const b = item.bookable;
    if (!b) return null;
    return b.featured_image || b.image || null;
  };

  const getBookableSubtitle = (bookable, label) => {
    if (!bookable) return '';
    if (label === 'hotel') return `${bookable.city || ''}${bookable.price_per_night ? ` · $${bookable.price_per_night}/night` : ''}`;
    if (label === 'activity') return `${bookable.city || bookable.location || ''}${bookable.price ? ` · $${bookable.price}` : ''}`;
    if (label === 'tour_guide') return `${bookable.role || ''}${bookable.hire_price_per_day ? ` · $${bookable.hire_price_per_day}/day` : ''}`;
    return '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const days = activeItinerary ? Array.from({ length: activeItinerary.duration_days || 0 }, (_, i) => i + 1) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-display text-neutral-900">Manage Itineraries</h2>
        {canManage && (
          <Button onClick={handleAddNew}>
            <Plus className="h-5 w-5" />
            Add New
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Input
          icon={Search}
          type="text"
          placeholder="Search itineraries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Itinerary</Th>
            <Th>Duration</Th>
            <Th>Price From</Th>
            <Th>Status</Th>
            <Th>Items</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {itineraries.map((itinerary) => (
            <tr key={itinerary.id}>
              <Td>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {itinerary.cover_image ? (
                      <img
                        src={itinerary.cover_image}
                        alt={itinerary.title}
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-neutral-100 flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-neutral-400" />
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-neutral-900">{itinerary.title}</div>
                  </div>
                </div>
              </Td>
              <Td>
                {itinerary.duration_days} day{itinerary.duration_days === 1 ? '' : 's'}
              </Td>
              <Td>
                {itinerary.price_from ? `$${itinerary.price_from}` : '—'}
              </Td>
              <Td>
                <Badge status={itinerary.status} />
              </Td>
              <Td className="text-neutral-500">{itinerary.items_count ?? 0}</Td>
              <Td className="text-right">
                {canManage && (
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEditModal(itinerary)} className="p-2 text-primary-600 hover:text-primary-800" title="Edit">
                      <Edit className="h-5 w-5" />
                    </button>
                    <button onClick={() => openItemsModal(itinerary)} className="p-2 text-green-600 hover:text-green-800" title="Manage Items">
                      <ListChecks className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(itinerary.id)} className="p-2 text-red-600 hover:text-red-800" title="Delete">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </Td>
            </tr>
          ))}
          {itineraries.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 sm:px-6 py-8 text-center text-sm text-neutral-500">
                No itineraries found.
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      {pagination.total > 0 && (
        <Pagination pagination={pagination} onPageChange={goToPage} onPerPageChange={setPerPage} itemLabel="itineraries" />
      )}

      {/* Edit / Create Modal */}
      <Modal
        open={editModal}
        onClose={closeEditModal}
        title={editingItinerary ? 'Edit Itinerary' : 'Add New Itinerary'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <Textarea
            label="Description"
            rows="3"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Cover Image</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={formData.cover_image || ''}
                onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                className="flex-1 px-4 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Image URL or select from gallery..."
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMediaPickerOpen(true)}
              >
                <ImageIcon className="h-5 w-5" />
                Select from Media Library
              </Button>
            </div>
          </div>
          {formData.cover_image && (
            <div className="mt-2 relative">
              <img
                src={formData.cover_image}
                alt="Preview"
                className="h-32 w-full object-cover rounded-xl"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, cover_image: '' })}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duration (days)"
              type="number"
              required
              min="1"
              value={formData.duration_days}
              onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
            />
            <Input
              label="From $ per person"
              type="number"
              min="0"
              step="0.01"
              value={formData.price_from}
              onChange={(e) => setFormData({ ...formData, price_from: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fixed Package Price ($)"
              type="number"
              min="0"
              step="0.01"
              value={formData.fixed_price}
              onChange={(e) => setFormData({ ...formData, fixed_price: e.target.value })}
              placeholder="Auto-computed if left blank"
            />
            <Input
              label="Max Travelers"
              type="number"
              min="1"
              value={formData.max_travelers}
              onChange={(e) => setFormData({ ...formData, max_travelers: e.target.value })}
              placeholder="Unlimited"
            />
          </div>
          <p className="text-xs text-neutral-500 -mt-2">
            The fixed price is what customers pay for the whole package at checkout. Leave blank and the price is computed from each item's per-traveler cost.
          </p>
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </Select>
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-neutral-700">Visible on public Itineraries page</span>
            </label>
            <p className="mt-1 text-xs text-neutral-500 ml-6">Only takes effect once status is set to Published.</p>
          </div>
          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="secondary" fullWidth onClick={closeEditModal}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={saving} disabled={saving}>
              {saving ? 'Saving...' : editingItinerary ? 'Update Itinerary' : 'Create Itinerary'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manage Items Modal */}
      <Modal
        open={itemsModal && !!activeItinerary}
        onClose={closeItemsModal}
        title={activeItinerary ? `Manage Items — ${activeItinerary.title}` : 'Manage Items'}
        size="xl"
      >
        {itemsLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {days.map((day) => {
              const dayItems = (activeItinerary?.items || [])
                .filter((item) => item.day_number === day)
                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

              return (
                <div key={day} className="border border-neutral-200 rounded-2xl p-4">
                  <h4 className="font-display font-semibold text-neutral-900 mb-3">Day {day}</h4>

                  {dayItems.length === 0 ? (
                    <p className="text-sm text-neutral-500 mb-3">No items added for this day yet.</p>
                  ) : (
                    <div className="space-y-2 mb-3">
                      {dayItems.map((item) => {
                        const badge = BOOKABLE_BADGES[item.bookable_label] || { label: item.bookable_label, tone: 'neutral' };
                        const thumb = getItemThumb(item);
                        return (
                          <div key={item.id} className="flex items-center justify-between bg-neutral-50 rounded-xl p-2">
                            <div className="flex items-center space-x-3">
                              {thumb ? (
                                <img src={thumb} alt={item.bookable?.name} className="h-10 w-10 rounded-lg object-cover" />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-neutral-200 flex items-center justify-center">
                                  <ImageIcon className="h-4 w-4 text-neutral-400" />
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-medium text-neutral-900">
                                  {item.bookable?.name || 'Unknown item'}
                                </div>
                                <Badge tone={badge.tone} className="mt-0.5">{badge.label}</Badge>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item)}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Remove item"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {addingToDay === day ? (
                    <div className="bg-neutral-50 rounded-xl p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-1">
                          {[
                            { key: 'hotel', label: 'Hotel', Icon: HotelIcon },
                            { key: 'activity', label: 'Activity', Icon: Compass },
                            { key: 'tour_guide', label: 'Tour Guide', Icon: UserRound },
                          ].map(({ key, label, Icon }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => { setPickerType(key); setPickerSearch(''); }}
                              className={`px-3 py-1.5 text-sm rounded-lg flex items-center space-x-1 ${
                                pickerType === key
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-white border border-neutral-300 text-neutral-600 hover:bg-neutral-100'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={closePicker}
                          className="text-neutral-400 hover:text-neutral-600"
                          title="Close"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <Input
                        icon={Search}
                        type="text"
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        placeholder={`Search ${pickerType === 'tour_guide' ? 'tour guides' : `${pickerType}s`}...`}
                        className="text-sm"
                      />

                      {pickerLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                        </div>
                      ) : pickerResults.length === 0 ? (
                        <p className="text-sm text-neutral-500 py-2">No results found.</p>
                      ) : (
                        <div className="space-y-1">
                          {pickerResults.map((result) => {
                            const thumb = result.featured_image || result.image || null;
                            return (
                              <div key={result.id} className="flex items-center justify-between bg-white border border-neutral-200 rounded-lg p-2">
                                <div className="flex items-center space-x-3">
                                  {thumb ? (
                                    <img src={thumb} alt={result.name} className="h-8 w-8 rounded-md object-cover" />
                                  ) : (
                                    <div className="h-8 w-8 rounded-md bg-neutral-100 flex items-center justify-center">
                                      <ImageIcon className="h-4 w-4 text-neutral-400" />
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-sm font-medium text-neutral-900">{result.name}</div>
                                    <div className="text-xs text-neutral-500">{getBookableSubtitle(result, pickerType)}</div>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleAddItem(result)}
                                  disabled={pickerAddingId === result.id}
                                  loading={pickerAddingId === result.id}
                                >
                                  {pickerAddingId === result.id ? 'Adding...' : 'Add'}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openPickerForDay(day)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add item to Day {day}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      <MediaPicker
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleImageSelect}
        folder="itineraries"
      />
    </div>
  );
};

export default AdminItineraries;
