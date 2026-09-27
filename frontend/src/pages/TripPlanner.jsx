import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, Plus, Trash2, X } from 'lucide-react';
import useTripStore from '../stores/tripStore';
import { useToast } from '../contexts/ToastContext';
import { Button, Input, Textarea, Card, Badge, Container } from '../components/ui';

const TripPlanner = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { trips, loading, fetchTrips, createTrip, deleteTrip } = useTripStore();

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', duration_days: 1 });

  useEffect(() => {
    fetchTrips();
  }, []);

  const resetForm = () => {
    setForm({ title: '', description: '', duration_days: 1 });
    setShowForm(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Please give your trip a title');
      return;
    }
    setSubmitting(true);
    const result = await createTrip({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      duration_days: Number(form.duration_days) || 1,
    });
    setSubmitting(false);
    if (result.success) {
      toast.success('Trip created!');
      resetForm();
      navigate(`/trip-planner/${result.trip.id}`);
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (e, trip) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete "${trip.title}"? This can't be undone.`)) return;
    setDeletingId(trip.id);
    const result = await deleteTrip(trip.id);
    setDeletingId(null);
    if (result.success) {
      toast.success('Trip deleted');
    } else {
      toast.error(result.error);
    }
  };

  if (loading && trips.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8 sm:py-12">
      <Container>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900">My Trips</h1>
            <p className="text-neutral-600 mt-2">Plan multi-day trips by combining hotels, activities, and guides.</p>
          </div>
          <Button variant="primary" onClick={() => setShowForm(true)} className="self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            <span>New Trip</span>
          </Button>
        </div>

        {trips.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center">
            <MapPin className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold text-neutral-900">You haven't planned any trips yet</h3>
            <p className="text-neutral-500 mt-2 max-w-md mx-auto">
              Create a trip and start adding hotels, activities, and tour guides to build your perfect itinerary.
            </p>
            <div className="mt-6">
              <Button variant="accent" size="lg" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                <span>New Trip</span>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {trips.map((trip) => (
              <Card
                key={trip.id}
                className="p-5 sm:p-6 cursor-pointer flex flex-col"
                onClick={() => navigate(`/trip-planner/${trip.id}`)}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-display text-lg font-bold text-neutral-900 line-clamp-2">{trip.title}</h3>
                  <button
                    onClick={(e) => handleDelete(e, trip)}
                    disabled={deletingId === trip.id}
                    className="text-neutral-400 hover:text-red-600 transition-colors shrink-0 disabled:opacity-50"
                    title="Delete trip"
                  >
                    {deletingId === trip.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {trip.description && (
                  <p className="text-sm text-neutral-600 line-clamp-2 mb-4">{trip.description}</p>
                )}
                <div className="mt-auto flex items-center justify-between pt-3 border-t border-neutral-100">
                  <Badge tone="primary">{trip.duration_days || 1} days</Badge>
                  <span className="text-xs text-neutral-500">
                    {trip.items_count || 0} {trip.items_count === 1 ? 'stop' : 'stops'} planned
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Container>

      {/* New Trip modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-neutral-200">
              <h2 className="font-display text-lg font-bold text-neutral-900">New Trip</h2>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-neutral-600" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <Input
                label="Trip title"
                placeholder="e.g. Kathmandu and Pokhara Adventure"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                autoFocus
              />
              <Textarea
                label="Description (optional)"
                placeholder="What's this trip about?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
              <Input
                type="number"
                min="1"
                label="Duration (days)"
                value={form.duration_days}
                onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
              />
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={submitting} className="flex-1">
                  Create Trip
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripPlanner;
