import { create } from 'zustand';
import { notificationsAPI } from '../services/api';

const POLL_INTERVAL_MS = 15000;

/**
 * Notification bell state — fetches history from the database and polls
 * for new ones every POLL_INTERVAL_MS while the app is open. No WebSocket
 * server (Reverb/Pusher) required: a booking/hire request's response SLA
 * is measured in minutes, so a ~15s worst-case delay before staff see it
 * is irrelevant in practice, and plain polling works on any host. Mirrors
 * the fetch/loading shape used by tripStore.js / authStore.js.
 */
const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  initialized: false,
  pollTimer: null,

  fetchNotifications: async ({ silent = false } = {}) => {
    if (get().loading) return;
    if (!silent) set({ loading: true });
    try {
      const response = await notificationsAPI.getAll();
      set({ notifications: response.data?.data || [], loading: false, initialized: true });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      set({ loading: false, initialized: true });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      set({ unreadCount: response.data?.count || 0 });
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      set({
        notifications: get().notifications.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
        unreadCount: Math.max(0, get().unreadCount - 1),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationsAPI.markAllAsRead();
      set({
        notifications: get().notifications.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })),
        unreadCount: 0,
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },

  // Starts polling for new notifications. Call once after login; call
  // unsubscribe() on logout. Safe to call multiple times — already-polling
  // is a no-op. userId isn't needed here (kept in the signature so layouts
  // calling subscribe(user.id) don't need to change).
  subscribe: () => {
    if (get().pollTimer) return;

    const tick = () => {
      get().fetchUnreadCount();
      // Keep an already-opened dropdown's list fresh too.
      if (get().initialized) get().fetchNotifications({ silent: true });
    };

    tick();
    const pollTimer = setInterval(tick, POLL_INTERVAL_MS);
    set({ pollTimer });
  },

  unsubscribe: () => {
    const { pollTimer } = get();
    if (pollTimer) clearInterval(pollTimer);
    set({ pollTimer: null });
  },

  reset: () => {
    get().unsubscribe();
    set({ notifications: [], unreadCount: 0, loading: false, initialized: false });
  },
}));

export default useNotificationStore;
