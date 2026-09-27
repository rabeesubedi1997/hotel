import { create } from 'zustand';
import { tripPlansAPI } from '../services/api';

/**
 * Personal trip-planner state. The backend (Api\Customer\TripPlanController)
 * is the source of truth — this store just caches the current user's trips
 * so the "Add to Trip" picker and the /trip-planner pages don't each refetch
 * independently, mirroring the fetch/loading/error shape used by
 * authStore.js / siteSettingsStore.js.
 */
const useTripStore = create((set, get) => ({
  trips: [],
  loading: false,
  error: null,
  initialized: false,

  fetchTrips: async (force = false) => {
    if (get().loading || (get().initialized && !force)) return;
    set({ loading: true, error: null });
    try {
      const response = await tripPlansAPI.getAll();
      set({ trips: response.data || [], loading: false, initialized: true });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load trips', loading: false, initialized: true });
    }
  },

  createTrip: async (data) => {
    try {
      const response = await tripPlansAPI.create(data);
      const trip = response.data.trip;
      set({ trips: [trip, ...get().trips] });
      return { success: true, trip };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to create trip' };
    }
  },

  deleteTrip: async (id) => {
    try {
      await tripPlansAPI.delete(id);
      set({ trips: get().trips.filter((t) => t.id !== id) });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to delete trip' };
    }
  },

  // Adds a hotel/activity/tour_guide to a trip and refreshes that trip's
  // cached item count so open pickers/lists reflect it immediately.
  addItemToTrip: async (tripId, payload) => {
    try {
      const response = await tripPlansAPI.addItem(tripId, payload);
      set({
        trips: get().trips.map((t) =>
          t.id === tripId ? { ...t, items_count: (t.items_count || 0) + 1 } : t
        ),
      });
      return { success: true, item: response.data.item };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to add item to trip' };
    }
  },

  reset: () => set({ trips: [], loading: false, error: null, initialized: false }),
}));

export default useTripStore;
