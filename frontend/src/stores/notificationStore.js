import { create } from 'zustand';
import { notificationsAPI } from '../services/api';
import { getEcho, disconnectEcho } from '../services/echo';

/**
 * Notification bell state — fetches history from the database (works even
 * before any live event arrives) and subscribes to the user's private
 * Reverb channel for live push while the app is open. Mirrors the
 * fetch/loading shape used by tripStore.js / authStore.js.
 */
const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  initialized: false,
  channel: null,

  fetchNotifications: async () => {
    if (get().loading) return;
    set({ loading: true });
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

  // Subscribes to the given user's private Reverb channel for live
  // notifications. Call once after login (userId available); call
  // unsubscribe() on logout. Safe to call multiple times — re-subscribing
  // for the same user is a no-op beyond re-registering the listener.
  subscribe: (userId) => {
    if (!userId || get().channel) return;

    const echo = getEcho();
    if (!echo) return;

    const channel = echo.private(`App.Models.User.${userId}`);
    channel.notification((notification) => {
      set({
        notifications: [{ id: notification.id, data: notification, read_at: null, created_at: new Date().toISOString() }, ...get().notifications],
        unreadCount: get().unreadCount + 1,
      });
    });

    set({ channel });
  },

  unsubscribe: () => {
    // Disconnecting the whole socket tears down every channel/listener on
    // it — no need to unsubscribe the notification channel individually.
    disconnectEcho();
    set({ channel: null });
  },

  reset: () => set({ notifications: [], unreadCount: 0, loading: false, initialized: false, channel: null }),
}));

export default useNotificationStore;
