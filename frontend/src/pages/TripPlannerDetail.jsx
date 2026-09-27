import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2,
  Pencil,
  X,
  Plus,
  Hotel as HotelIcon,
  Compass,
  UserRound,
  MapPin,
  Clock,
  Search,
} from 'lucide-react';
import { tripPlansAPI, hotelsAPI, activitiesAPI, publicAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { Button, Input, Textarea, Card, Badge, Container } from '../components/ui';

const TABS = [
  { key: 'hotel', label: 'Hotels', icon: HotelIcon },
  { key: 'activity', label: 'Activities', icon: Compass },
  { key: 'tour_guide', label: 'Tour Guides', icon: UserRound },
];

const bookableThumb = (bookable) => bookable?.featured_image || bookable?.image || null;

const bookableDetail = (label, bookable) => {
  if (!bookable) return '';
  if (label === 'hotel') return bookable.city || '';
  if (label === 'activity') return bookable.duration || bookable.location || '';
  if (label === 'tour_guide') return bookable.role || '';
  return '';
};

const TripPlannerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', duration_days: 1 });
  const [savingEdit, setSavingEdit] = useState(false);

  const [pickerDay, setPickerDay] = useState(null); // day_number the picker is targeting, or null
  const [removingItemId, setRemovingItemId] = useState(null);

  useEffect(() => {
    fetchTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchTrip = async () => {
    setLoading(true);
    try {
      const response = await tripPlansAPI.getById(id);
      setTrip(response.data);
      setEditForm({
        title: response.data.title || '',
        description: response.data.description || '',
        duration_days: response.data.duration_days || 1,
      });
    } catch (error) {
      console.error('Error fetching trip:', error);
      toast.error('This trip could not be found');
      navigate('/trip-planner');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim()) {
      toast.error('Trip title is required');
      return;
    }
    setSavingEdit(true);
    try {
      const response = await tripPlansAPI.update(id, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        duration_days: Number(editForm.duration_days) || 1,
      });
      setTrip((prev) => ({ ...prev, ...response.data.trip }));
      toast.success('Trip updated');
      setEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update trip');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setRemovingItemId(itemId);
    try {
      await tripPlansAPI.removeItem(id, itemId);
      setTrip((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== itemId) }));
      toast.success('Removed from trip');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove item');
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleItemAdded = (item) => {
    setTrip((prev) => ({ ...prev, items: [...(prev.items || []), item] }));
    setPickerDay(null);
    toast.success('Added to trip');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!trip) return null;

  const durationDays = trip.duration_days || 1;
  const itemsByDay = {};
  (trip.items || []).forEach((item) => {
    const day = item.day_number || 1;
    if (!itemsByDay[day]) itemsByDay[day] = [];
    itemsByDay[day].push(item);
  });

  const totalItems = (trip.items || []).length;

  return (
    <div className="min-h-screen bg-neutral-50 py-8 sm:py-12">
      <Container>
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 break-words">
                  {trip.title}
                </h1>
                <button
                  onClick={() => setEditing(true)}
                  className="p-2 rounded-full hover:bg-neutral-200 text-neutral-500 transition-colors shrink-0"
                  title="Edit trip"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              {trip.description && <p className="text-neutral-600 mt-2 max-w-2xl">{trip.description}</p>}
              <div className="mt-3">
                <Badge tone="primary">{durationDays} days</Badge>
              </div>
            </div>
            <Button
              variant="accent"
              size="lg"
              disabled={totalItems === 0}
              title={totalItems === 0 ? 'Add at least one stop before booking' : undefined}
              onClick={() => navigate(`/checkout?mode=trip&tripId=${trip.id}`)}
              className="self-start shrink-0"
            >
              Book this trip
            </Button>
          </div>
        </div>

        {/* Day-by-day builder */}
        <div className="space-y-8">
          {Array.from({ length: durationDays }, (_, i) => i + 1).map((day) => {
            const dayItems = itemsByDay[day] || [];
            return (
              <div key={day}>
                <h2 className="font-display text-xl font-bold text-neutral-900 mb-3">Day {day}</h2>

                {dayItems.length === 0 ? (
                  <Card className="p-6 text-center border-dashed" hoverLift={false}>
                    <p className="text-neutral-500 text-sm">Nothing planned for this day yet.</p>
                  </Card>
                ) : (
                  <div className="space-y-3 mb-3">
                    {dayItems.map((item) => {
                      const bookable = item.bookable;
                      const thumb = bookableThumb(bookable);
                      return (
                        <Card key={item.id} hoverLift={false} className="p-3 sm:p-4 flex items-center gap-4">
                          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                            {thumb ? (
                              <img src={thumb} alt={bookable?.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-neutral-300">
                                {item.bookable_label === 'hotel' && <HotelIcon className="h-6 w-6" />}
                                {item.bookable_label === 'activity' && <Compass className="h-6 w-6" />}
                                {item.bookable_label === 'tour_guide' && <UserRound className="h-6 w-6" />}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge tone="neutral">{item.bookable_label?.replace('_', ' ')}</Badge>
                            </div>
                            <h3 className="font-semibold text-neutral-900 truncate">{bookable?.name}</h3>
                            {bookableDetail(item.bookable_label, bookable) && (
                              <p className="text-sm text-neutral-500 truncate">
                                {bookableDetail(item.bookable_label, bookable)}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{item.notes}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={removingItemId === item.id}
                            className="text-neutral-400 hover:text-red-600 transition-colors shrink-0 p-1 disabled:opacity-50"
                            title="Remove from trip"
                          >
                            {removingItemId === item.id ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <X className="h-5 w-5" />
                            )}
                          </button>
                        </Card>
                      );
                    })}
                  </div>
                )}

                <Button variant="secondary" size="sm" onClick={() => setPickerDay(day)}>
                  <Plus className="h-4 w-4" />
                  <span>Add to Day {day}</span>
                </Button>
              </div>
            );
          })}
        </div>
      </Container>

      {/* Edit trip modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-neutral-200">
              <h2 className="font-display text-lg font-bold text-neutral-900">Edit Trip</h2>
              <button
                onClick={() => setEditing(false)}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-neutral-600" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <Input
                label="Trip title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                required
                autoFocus
              />
              <Textarea
                label="Description (optional)"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
              <Input
                type="number"
                min="1"
                label="Duration (days)"
                value={editForm.duration_days}
                onChange={(e) => setEditForm({ ...editForm, duration_days: e.target.value })}
              />
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={savingEdit} className="flex-1">
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item picker */}
      {pickerDay !== null && (
        <ItemPicker
          tripId={trip.id}
          day={pickerDay}
          onClose={() => setPickerDay(null)}
          onAdded={handleItemAdded}
        />
      )}
    </div>
  );
};

// --- Item picker modal -----------------------------------------------------

const ItemPicker = ({ tripId, day, onClose, onAdded }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('hotel');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const debounceRef = useRef(null);

  const fetchResults = useCallback(async (tab, query) => {
    setLoading(true);
    try {
      if (tab === 'hotel') {
        const response = await hotelsAPI.getAll({ search: query || undefined, per_page: 6 });
        setResults(response.data.data || []);
      } else if (tab === 'activity') {
        const response = await activitiesAPI.getAll({ search: query || undefined, per_page: 6 });
        setResults(response.data.data || []);
      } else {
        const response = await publicAPI.getTourGuides();
        const all = Array.isArray(response.data) ? response.data : response.data?.data || [];
        const filtered = query
          ? all.filter((g) => g.name?.toLowerCase().includes(query.toLowerCase()))
          : all;
        setResults(filtered.slice(0, 6));
      }
    } catch (error) {
      console.error('Error searching:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults(activeTab, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(activeTab, search);
    }, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleAdd = async (item) => {
    setAddingId(item.id);
    try {
      const response = await tripPlansAPI.addItem(tripId, {
        bookable_type: activeTab,
        bookable_id: item.id,
        day_number: day,
      });
      onAdded(response.data.item);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add to trip');
    } finally {
      setAddingId(null);
    }
  };

  const detailFor = (tab, item) => {
    if (tab === 'hotel') return item.city;
    if (tab === 'activity') return item.duration || item.location;
    return item.role;
  };

  const thumbFor = (item) => item.featured_image || item.image || null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-200 shrink-0">
          <h2 className="font-display text-lg font-bold text-neutral-900">Add to Day {day}</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="h-5 w-5 text-neutral-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSearch('');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors ${
                  active ? 'text-primary-600 border-b-2 border-primary-600' : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 shrink-0">
          <Input
            icon={Search}
            placeholder={`Search ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-neutral-500 text-sm py-8">No results found.</p>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors"
              >
                <div className="h-12 w-12 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                  {thumbFor(item) ? (
                    <img src={thumbFor(item)} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-neutral-300">
                      <MapPin className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-900 truncate text-sm">{item.name}</p>
                  {detailFor(activeTab, item) && (
                    <p className="text-xs text-neutral-500 truncate flex items-center gap-1">
                      {activeTab === 'activity' ? <Clock className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                      {detailFor(activeTab, item)}
                    </p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAdd(item)}
                  loading={addingId === item.id}
                  className="shrink-0"
                >
                  Add
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TripPlannerDetail;
