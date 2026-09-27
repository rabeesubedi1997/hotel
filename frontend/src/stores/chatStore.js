import { create } from 'zustand';
import { chatAPI } from '../services/api';
import { getEcho } from '../services/echo';

/**
 * Direct chat state — shared by the customer/vendor/admin Messages pages.
 * Conversation list comes from the database; the open thread also
 * subscribes to that conversation's private Reverb channel for live
 * delivery while it's open (see App\Events\NewChatMessage on the backend).
 */
const useChatStore = create((set, get) => ({
  conversations: [],
  conversationsLoading: false,

  activeConversation: null,
  messages: [],
  messagesLoading: false,
  activeChannel: null,
  activeChannelId: null,

  // Anonymous floating-widget session — set once by startGuestConversation,
  // never written to localStorage's shared 'token' key (see api.js).
  guestToken: (() => {
    try { return sessionStorage.getItem('guestChatToken'); } catch { return null; }
  })(),
  pollTimer: null,

  startGuestConversation: async ({ name, email, phone, message }) => {
    try {
      const response = await chatAPI.guestStart({ name, email, phone, message });
      const { token, conversation, sent } = response.data;
      try {
        sessionStorage.setItem('guestChatToken', token);
        sessionStorage.setItem('guestChatConversationId', String(conversation.id));
      } catch { /* private browsing, etc. */ }
      set({
        guestToken: token,
        activeConversation: conversation,
        messages: [sent],
      });
      get().startGuestPolling(conversation.id);
      return { success: true, conversation };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to start chat' };
    }
  },

  // No anonymous Echo/Reverb auth (v1) — poll the thread instead while the
  // widget is open so a guest still sees replies without a page refresh.
  startGuestPolling: (id) => {
    get().stopGuestPolling();
    const timer = setInterval(async () => {
      const { guestToken } = get();
      if (!guestToken) return;
      try {
        const response = await chatAPI.getConversation(id, guestToken);
        set({ messages: response.data.messages || [] });
      } catch { /* transient — try again next tick */ }
    }, 8000);
    set({ pollTimer: timer });
  },

  stopGuestPolling: () => {
    const { pollTimer } = get();
    if (pollTimer) clearInterval(pollTimer);
    set({ pollTimer: null });
  },

  // Reopens a guest's thread after a page refresh within the same tab
  // (guestToken + conversation id both live in sessionStorage, never the
  // shared 'token' key an authenticated session uses).
  restoreGuestSession: () => {
    const { guestToken, activeConversation } = get();
    if (!guestToken || activeConversation) return;
    let conversationId;
    try { conversationId = sessionStorage.getItem('guestChatConversationId'); } catch { return; }
    if (conversationId) get().openConversation(conversationId);
  },

  fetchConversations: async () => {
    set({ conversationsLoading: true });
    try {
      const response = await chatAPI.getConversations();
      set({ conversations: response.data?.data || [], conversationsLoading: false });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      set({ conversationsLoading: false });
    }
  },

  // Starts a new conversation (or reuses the existing one for the same
  // customer+vendor+subject pairing — the backend handles that
  // idempotently) and returns it so the caller can navigate to it.
  startConversation: async (payload) => {
    try {
      const response = await chatAPI.startConversation(payload);
      return { success: true, conversation: response.data.conversation };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to start conversation' };
    }
  },

  openConversation: async (id) => {
    set({ messagesLoading: true });
    get().leaveActiveChannel();
    try {
      const response = await chatAPI.getConversation(id, get().guestToken);
      set({
        activeConversation: response.data,
        messages: response.data.messages || [],
        messagesLoading: false,
      });
      chatAPI.markRead(id, get().guestToken).catch(() => {});
      // The inbox list's unread badge was fetched before this thread was
      // read — zero it locally rather than waiting on a full refetch.
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === Number(id) ? { ...c, unread_count: 0 } : c
        ),
      }));
      if (get().guestToken) {
        get().startGuestPolling(id);
      } else {
        get().subscribeToActive(id);
      }
    } catch (error) {
      console.error('Error opening conversation:', error);
      set({ messagesLoading: false });
    }
  },

  sendMessage: async (id, body) => {
    try {
      const response = await chatAPI.sendMessage(id, body, get().guestToken);
      const sent = response.data.sent;
      // The live broadcast (toOthers()) won't echo back to the sender, so
      // append locally; guard by id in case it somehow does arrive too.
      set((state) => (
        state.messages.some((m) => m.id === sent.id)
          ? state
          : { messages: [...state.messages, sent] }
      ));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to send message' };
    }
  },

  subscribeToActive: (id) => {
    const echo = getEcho();
    if (!echo) return;

    const channel = echo.private(`conversation.${id}`);
    channel.listen('.new.message', (message) => {
      set((state) =>
        state.messages.some((m) => m.id === message.id)
          ? state
          : { messages: [...state.messages, message] }
      );
      chatAPI.markRead(id).catch(() => {});
    });

    set({ activeChannel: channel, activeChannelId: id });
  },

  // Stops listening AND actually leaves the private channel — without the
  // echo.leave() call the client stayed joined to every conversation ever
  // opened for the rest of the session.
  leaveActiveChannel: () => {
    const { activeChannel, activeChannelId } = get();
    if (activeChannel) {
      activeChannel.stopListening('.new.message');
    }
    if (activeChannelId != null) {
      const echo = getEcho();
      echo?.leave(`conversation.${activeChannelId}`);
    }
    set({ activeChannel: null, activeChannelId: null });
  },

  closeConversation: () => {
    get().leaveActiveChannel();
    get().stopGuestPolling();
    set({ activeConversation: null, messages: [] });
  },

  reset: () => {
    get().leaveActiveChannel();
    get().stopGuestPolling();
    set({ conversations: [], activeConversation: null, messages: [], conversationsLoading: false, messagesLoading: false });
  },
}));

export default useChatStore;
