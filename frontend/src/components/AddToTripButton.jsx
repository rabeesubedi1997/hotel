import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPinned, Plus, X, Loader2 } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import useTripStore from '../stores/tripStore';
import { useToast } from '../contexts/ToastContext';
import { Button, Input } from './ui';

/**
 * "Add to Trip" action reused on hotel/activity/tour-guide cards and detail
 * pages. Opens a small modal listing the customer's personal trips (from
 * tripStore) with a one-tap add per trip, plus a quick "create new trip"
 * form — mirrors the WishlistButton's role but for the trip planner.
 *
 *   <AddToTripButton bookableType="hotel" bookableId={hotel.id} bookableName={hotel.name} />
 */
const AddToTripButton = ({ bookableType, bookableId, bookableName, variant = 'icon', className = '' }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { trips, loading, fetchTrips, createTrip, addItemToTrip } = useTripStore();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [addingTripId, setAddingTripId] = useState(null);
  const [newTripTitle, setNewTripTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const openPicker = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!isAuthenticated) {
      toast.info('Please log in to plan a trip.');
      navigate('/login');
      return;
    }
    setOpen(true);
    fetchTrips();
  };

  const close = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setOpen(false);
    setNewTripTitle('');
  };

  const handleAdd = async (tripId, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setAddingTripId(tripId);
    const result = await addItemToTrip(tripId, { bookable_type: bookableType, bookable_id: bookableId });
    setAddingTripId(null);
    if (result.success) {
      toast.success(`${bookableName || 'Item'} added to your trip.`);
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleCreateAndAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newTripTitle.trim()) return;
    setCreating(true);
    const created = await createTrip({ title: newTripTitle.trim() });
    if (!created.success) {
      toast.error(created.error);
      setCreating(false);
      return;
    }
    const result = await addItemToTrip(created.trip.id, { bookable_type: bookableType, bookable_id: bookableId });
    setCreating(false);
    if (result.success) {
      toast.success(`Created "${created.trip.title}" and added ${bookableName || 'item'}.`);
      setOpen(false);
      setNewTripTitle('');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={openPicker}
          aria-label="Add to trip"
          className="p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors shadow-sm"
        >
          <MapPinned className="h-5 w-5 text-neutral-700" />
        </button>
      ) : (
        <Button variant="secondary" size="sm" onClick={openPicker} className={className}>
          <MapPinned className="h-4 w-4" /> Add to trip
        </Button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={close} />
          <div
            className="absolute right-0 z-50 mt-2 w-72 bg-white rounded-2xl shadow-card-hover border border-neutral-100 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-display font-semibold text-neutral-900 text-sm">Add to a trip</h4>
              <button onClick={close} aria-label="Close" className="text-neutral-400 hover:text-neutral-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 mb-3">
                {trips.length === 0 ? (
                  <p className="text-sm text-neutral-500 py-2">No trips yet — create one below.</p>
                ) : (
                  trips.map((trip) => (
                    <button
                      key={trip.id}
                      onClick={(e) => handleAdd(trip.id, e)}
                      disabled={addingTripId === trip.id}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-50 text-left transition-colors disabled:opacity-50"
                    >
                      <span className="text-sm text-neutral-800 truncate">{trip.title}</span>
                      {addingTripId === trip.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary-600 shrink-0" />
                      ) : (
                        <Plus className="h-4 w-4 text-primary-600 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            <form onSubmit={handleCreateAndAdd} className="flex gap-2 pt-3 border-t border-neutral-100">
              <Input
                value={newTripTitle}
                onChange={(e) => setNewTripTitle(e.target.value)}
                placeholder="New trip name…"
                className="flex-1"
              />
              <Button type="submit" size="md" loading={creating} disabled={!newTripTitle.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default AddToTripButton;
