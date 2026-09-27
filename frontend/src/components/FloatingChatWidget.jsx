import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Headset, Loader2, Mail, MessageCircle, Send, User as UserIcon, X } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import useSiteSettingsStore from '../stores/siteSettingsStore';

// wa.me wants digits only (no +, spaces, or dashes).
const toWhatsAppDigits = (phone) => (phone || '').replace(/[^0-9]/g, '');

// A configured Facebook page URL (facebook.com/<page>) doubles as the m.me
// deep-link target — Messenger has no separate "page id" setting here.
const toMessengerHandle = (facebookUrl) => {
  if (!facebookUrl) return '';
  const match = facebookUrl.match(/facebook\.com\/([^/?#]+)/i);
  return match ? match[1] : '';
};

// Site-wide "chat with support" bubble — the thing none of the competitor
// sites offer natively (they all hand off to WhatsApp/Viber/Messenger).
// Scoped to a single support conversation per customer, reusing the same
// chatStore/Reverb plumbing as the full /messages page.
const FloatingChatWidget = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const {
    conversations,
    conversationsLoading,
    fetchConversations,
    activeConversation,
    messages,
    messagesLoading,
    openConversation,
    startConversation,
    sendMessage,
    closeConversation,
    guestToken,
    startGuestConversation,
    restoreGuestSession,
  } = useChatStore();

  const { getContactInfo, getSocialLinks } = useSiteSettingsStore();

  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [guestForm, setGuestForm] = useState({ name: '', email: '', phone: '' });
  const messagesEndRef = useRef(null);

  const canChat = isAuthenticated || !!guestToken;
  // A guest has no `user` from authStore — fall back to the conversation's
  // own customer id (the real User row guestStart created) so their own
  // bubbles still align right instead of looking like the support side.
  const ownUserId = user?.id ?? activeConversation?.customer_id ?? activeConversation?.customer?.id;

  const whatsappDigits = toWhatsAppDigits(getContactInfo().phone);
  const messengerHandle = toMessengerHandle(getSocialLinks().facebook);

  const supportConversation = conversations.find((c) => c.type === 'support');
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  useEffect(() => {
    if (isAuthenticated) fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Reset the widget on logout so the next visitor doesn't see a stale thread.
  useEffect(() => {
    if (!isAuthenticated) {
      closeConversation();
      setIsOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // A returning guest (page refresh, same tab) — silently reopen their
  // in-progress thread rather than asking for their name again.
  useEffect(() => {
    if (!isAuthenticated && guestToken) restoreGuestSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // The full dedicated inbox already exists at /messages — don't float a
  // second chat UI on top of it.
  if (location.pathname.startsWith('/messages')) return null;

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && isAuthenticated && supportConversation && !activeConversation) {
      openConversation(supportConversation.id);
    }
    if (next && !isAuthenticated && guestToken && !activeConversation) {
      restoreGuestSession();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    closeConversation();
  };

  const handleStart = async (e) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    setError('');
    const result = await startConversation({ type: 'support', message: draft.trim() });
    setSending(false);
    if (result.success) {
      setDraft('');
      fetchConversations();
      openConversation(result.conversation.id);
    } else {
      setError(result.error || 'Failed to send message');
    }
  };

  const handleGuestStart = async (e) => {
    e.preventDefault();
    if (!guestForm.name.trim() || !guestForm.email.trim() || !draft.trim() || sending) return;
    setSending(true);
    setError('');
    const result = await startGuestConversation({
      name: guestForm.name.trim(),
      email: guestForm.email.trim(),
      phone: guestForm.phone.trim() || undefined,
      message: draft.trim(),
    });
    setSending(false);
    if (result.success) {
      setDraft('');
    } else {
      setError(result.error || 'Failed to start chat');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || sending || !activeConversation) return;
    setSending(true);
    const result = await sendMessage(activeConversation.id, draft.trim());
    setSending(false);
    if (result.success) {
      setDraft('');
    } else {
      setError(result.error || 'Failed to send message');
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-[calc(100vw-2.5rem)] max-w-[360px] h-[480px] max-h-[70vh] bg-white rounded-2xl shadow-card-hover border border-neutral-100 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3.5 bg-primary-700 text-white shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <Headset className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-display font-semibold text-sm truncate">Chat with us</p>
                <p className="text-[11px] text-white/70">We usually reply within minutes</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close chat"
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto bg-neutral-50">
            {!canChat && !activeConversation ? (
              <form onSubmit={handleGuestStart} className="p-5 h-full flex flex-col justify-center overflow-y-auto">
                <p className="text-sm font-medium text-neutral-800 mb-1">Chat with our team</p>
                <p className="text-xs text-neutral-500 mb-3">No account needed — just tell us who you are.</p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 bg-white">
                    <UserIcon className="h-4 w-4 text-neutral-400 shrink-0" />
                    <input
                      type="text"
                      value={guestForm.name}
                      onChange={(e) => setGuestForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Your name"
                      required
                      className="w-full text-sm outline-none bg-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 bg-white">
                    <Mail className="h-4 w-4 text-neutral-400 shrink-0" />
                    <input
                      type="email"
                      value={guestForm.email}
                      onChange={(e) => setGuestForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="Your email"
                      required
                      className="w-full text-sm outline-none bg-transparent"
                    />
                  </div>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    placeholder="Hi, I have a question about..."
                    required
                    className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none bg-white"
                  />
                </div>
                {error && <p className="text-xs text-danger-600 mt-1.5">{error}</p>}
                <button
                  type="submit"
                  disabled={!guestForm.name.trim() || !guestForm.email.trim() || !draft.trim() || sending}
                  className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Start chat
                </button>

                <div className="text-center mt-3">
                  <Link to="/login" onClick={() => setIsOpen(false)} className="text-xs text-neutral-500 hover:text-primary-600">
                    Already have an account? Log in instead
                  </Link>
                </div>

                {(whatsappDigits || messengerHandle) && (
                  <div className="mt-4 pt-4 border-t border-neutral-100 w-full">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-400 mb-2.5 text-center">Or reach us instantly</p>
                    <div className="flex items-center justify-center gap-2.5">
                      {whatsappDigits && (
                        <a
                          href={`https://wa.me/${whatsappDigits}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366]/10 text-[#128C7E] text-xs font-semibold hover:bg-[#25D366]/20 transition-colors"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      )}
                      {messengerHandle && (
                        <a
                          href={`https://m.me/${messengerHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0084FF]/10 text-[#0084FF] text-xs font-semibold hover:bg-[#0084FF]/20 transition-colors"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Messenger
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </form>
            ) : conversationsLoading && conversations.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
              </div>
            ) : activeConversation ? (
              <div className="p-4 space-y-3">
                {messagesLoading && messages.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                  </div>
                ) : (
                  messages.map((m) => {
                    const isOwn = m.sender_id === ownUserId;
                    return (
                      <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-line break-words ${
                            isOwn
                              ? 'bg-primary-600 text-white rounded-br-md'
                              : 'bg-white text-neutral-800 border border-neutral-100 rounded-bl-md'
                          }`}
                        >
                          {m.body}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <form onSubmit={handleStart} className="p-5 h-full flex flex-col justify-center">
                <p className="text-sm font-medium text-neutral-800 mb-1">What can we help you with?</p>
                <p className="text-xs text-neutral-500 mb-3">Send us a message and our team will get back to you here.</p>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  placeholder="Hi, I have a question about..."
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none bg-white"
                  autoFocus
                />
                {error && <p className="text-xs text-danger-600 mt-1.5">{error}</p>}
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send message
                </button>
              </form>
            )}
          </div>

          {/* Footer — only once a thread exists */}
          {canChat && activeConversation && (
            <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-neutral-100 bg-white shrink-0">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                aria-label="Send"
                className="p-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleToggle}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        className="relative h-14 w-14 rounded-full bg-primary-600 text-white shadow-card-hover hover:bg-primary-700 hover:scale-105 transition-all flex items-center justify-center"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!isOpen && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-accent-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-white">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>
    </div>
  );
};

export default FloatingChatWidget;
