import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Send, ArrowLeft, MessageSquare, Headset, Inbox } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import { useToast } from '../contexts/ToastContext';
import { Button, Card, Badge, Container } from '../components/ui';

// Short relative-ish timestamp for the conversation list (e.g. "2h", "3d", "Sep 4").
const formatShortTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatMessageTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// Resolves the "other party" for a conversation row/header, regardless of
// whether it's a vendor_inquiry (show the vendor) or support thread (show a
// generic Support Team identity — there's no single "other user" for those).
const getOtherParty = (conversation) => {
  if (!conversation) return { label: 'Conversation', isSupport: false };
  if (conversation.type === 'support') {
    return { label: 'Support Team', isSupport: true };
  }
  const vendor = conversation.vendor;
  return {
    label: vendor?.company_name || vendor?.name || 'Vendor',
    avatar: vendor?.avatar,
    isSupport: false,
  };
};

const Avatar = ({ label, avatar, isSupport, size = 'md' }) => {
  const sizeClasses = size === 'lg' ? 'h-12 w-12 text-base' : 'h-11 w-11 text-sm';
  if (isSupport) {
    return (
      <span className={`${sizeClasses} rounded-full bg-accent-50 text-accent-600 flex items-center justify-center flex-shrink-0`}>
        <Headset className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} />
      </span>
    );
  }
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={label}
        className={`${sizeClasses} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <span className={`${sizeClasses} rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold flex-shrink-0`}>
      {(label || '?').charAt(0).toUpperCase()}
    </span>
  );
};

// Inline "start a conversation with support" composer shown in the empty
// state — lets the customer write their own first message instead of
// firing off a canned one.
const SupportComposeBox = ({ onSent }) => {
  const { startConversation } = useChatStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    const result = await startConversation({ type: 'support', message: text.trim() });
    setSubmitting(false);
    if (result.success) {
      onSent?.();
      navigate(`/messages/${result.conversation.id}`);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 w-full max-w-md mx-auto text-left">
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
        What can we help you with?
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Hi, I have a question about..."
        className="w-full px-3 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none"
        autoFocus
      />
      <Button type="submit" variant="primary" className="mt-3" loading={submitting} disabled={!text.trim()}>
        <Send className="h-4 w-4" />
        Send to Support
      </Button>
    </form>
  );
};

const ConversationRow = ({ conversation, active }) => {
  const other = getOtherParty(conversation);
  const preview = conversation.latest_message?.body || 'No messages yet';

  return (
    <Link
      to={`/messages/${conversation.id}`}
      className={`flex items-start gap-3 p-3.5 rounded-2xl transition-colors ${
        active ? 'bg-primary-50' : 'hover:bg-neutral-50'
      }`}
    >
      <Avatar label={other.label} avatar={other.avatar} isSupport={other.isSupport} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-neutral-900 text-sm truncate">{other.label}</span>
          <span className="text-xs text-neutral-400 flex-shrink-0">
            {formatShortTime(conversation.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-sm text-neutral-500 truncate">{preview}</p>
          {conversation.unread_count > 0 && (
            <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary-600 text-white text-xs font-semibold flex items-center justify-center">
              {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

const MessageBubble = ({ message, isOwn }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[80%] sm:max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
      {!isOwn && (
        <span className="text-xs text-neutral-500 mb-1 ml-1">{message.sender?.name || 'Them'}</span>
      )}
      <div
        className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line break-words ${
          isOwn
            ? 'bg-primary-600 text-white rounded-br-md'
            : 'bg-neutral-100 text-neutral-800 rounded-bl-md'
        }`}
      >
        {message.body}
      </div>
      <span className="text-[11px] text-neutral-400 mt-1 mx-1">{formatMessageTime(message.created_at)}</span>
    </div>
  </div>
);

const Messages = () => {
  const { id } = useParams();
  const toast = useToast();
  const { user } = useAuthStore();
  const {
    conversations,
    conversationsLoading,
    fetchConversations,
    activeConversation,
    messages,
    messagesLoading,
    openConversation,
    sendMessage,
    closeConversation,
  } = useChatStore();

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (id) {
      openConversation(id);
    }
    return () => {
      closeConversation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !activeConversation) return;
    setSending(true);
    const result = await sendMessage(activeConversation.id, draft.trim());
    setSending(false);
    if (result.success) {
      setDraft('');
    } else {
      toast.error(result.error);
    }
  };

  const other = activeConversation ? getOtherParty(activeConversation) : null;

  const showEmptyState = !conversationsLoading && conversations.length === 0 && !id;

  return (
    <div className="min-h-screen bg-neutral-50 py-6 sm:py-10">
      <Container>
        <div className="mb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900">Messages</h1>
          <p className="text-neutral-600 mt-2">Chat with hosts about your bookings, or reach out to support.</p>
        </div>

        {conversationsLoading && conversations.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : showEmptyState ? (
          <Card className="p-8 sm:p-12 text-center">
            <Inbox className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold text-neutral-900">No messages yet</h3>
            <p className="text-neutral-500 mt-2 max-w-md mx-auto">
              Reach out to a host from any hotel, activity, or tour guide page, or send us a message below and
              we'll get back to you.
            </p>
            <SupportComposeBox onSent={fetchConversations} />
          </Card>
        ) : (
        <Card hoverLift={false} className="overflow-hidden">
          <div className="flex h-[32rem] sm:h-[36rem]">
            {/* Left panel: conversation list */}
            <div
              className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-neutral-100 flex flex-col ${
                id ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className="px-4 py-3 border-b border-neutral-100">
                <h2 className="font-display font-bold text-neutral-900">Inbox</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {conversationsLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {conversations.map((conversation) => (
                      <ConversationRow
                        key={conversation.id}
                        conversation={conversation}
                        active={String(conversation.id) === String(id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right panel: active thread */}
            <div className={`flex-1 flex-col min-w-0 ${id ? 'flex' : 'hidden md:flex'}`}>
              {!id ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                  <MessageSquare className="h-12 w-12 text-neutral-300 mb-3" />
                  <h3 className="font-display text-lg font-bold text-neutral-900">Select a conversation</h3>
                  <p className="text-neutral-500 text-sm mt-1 max-w-xs">
                    Choose a conversation from the list to view messages.
                  </p>
                </div>
              ) : messagesLoading && !activeConversation ? (
                <div className="flex-1 flex justify-center items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                </div>
              ) : !activeConversation ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                  <p className="text-neutral-500 text-sm">Conversation not found.</p>
                  <Link to="/messages" className="text-primary-600 text-sm mt-2 hover:underline">
                    Back to messages
                  </Link>
                </div>
              ) : (
                <>
                  {/* Thread header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100">
                    <Link
                      to="/messages"
                      className="md:hidden -ml-1 p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500"
                      aria-label="Back to messages"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <Avatar label={other.label} avatar={other.avatar} isSupport={other.isSupport} />
                    <div className="min-w-0">
                      <div className="font-semibold text-neutral-900 text-sm truncate">{other.label}</div>
                      {activeConversation.type === 'vendor_inquiry' && activeConversation.subject_type && (
                        <Badge tone="neutral" className="mt-0.5 normal-case">
                          Re: {activeConversation.subject_type.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Message list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messagesLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="text-center text-sm text-neutral-400 mt-8">
                        No messages yet — say hello!
                      </p>
                    ) : (
                      messages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          isOwn={message.sender_id === user?.id}
                        />
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Composer */}
                  <form onSubmit={handleSend} className="flex items-end gap-2 p-3 border-t border-neutral-100">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }}
                      rows={1}
                      placeholder="Write a message…"
                      className="flex-1 px-3.5 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none max-h-32"
                    />
                    <Button type="submit" size="md" loading={sending} disabled={!draft.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        </Card>
        )}
      </Container>
    </div>
  );
};

export default Messages;
