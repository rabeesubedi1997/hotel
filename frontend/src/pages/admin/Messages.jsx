import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageSquare, Send } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useChatStore from '../../stores/chatStore';
import { useToast } from '../../contexts/ToastContext';
import { Badge, Button, Textarea } from '../../components/ui';

const TYPE_LABEL = {
  support: 'Support',
  vendor_inquiry: 'Vendor Inquiry',
};

const TYPE_TONE = {
  support: 'primary',
  vendor_inquiry: 'accent',
};

const TypeBadge = ({ type }) => (
  <Badge tone={TYPE_TONE[type] || 'neutral'}>{TYPE_LABEL[type] || type}</Badge>
);

const Avatar = ({ name, src, size = 'h-10 w-10' }) => {
  if (src) {
    return <img src={src} alt={name || ''} className={`${size} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`${size} rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold shrink-0`}>
      {name ? name.charAt(0).toUpperCase() : '?'}
    </div>
  );
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const AdminMessages = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const toast = useToast();

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

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [messages]);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [conversations]);

  const handleSend = async () => {
    const body = replyText.trim();
    if (!body || !activeConversation || sending) return;

    setSending(true);
    const result = await sendMessage(activeConversation.id, body);
    setSending(false);

    if (result.success) {
      setReplyText('');
    } else {
      toast.error(result.error || 'Failed to send message');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary-600" />
          Messages
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Support conversations and vendor inquiries in one inbox.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-[calc(100vh-14rem)] min-h-[480px]">
        {/* Conversation list */}
        <div
          className={`${id ? 'hidden lg:flex' : 'flex'} lg:w-80 xl:w-96 shrink-0 flex-col bg-white rounded-2xl shadow-card overflow-hidden`}
        >
          {conversationsLoading && conversations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : sortedConversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="h-10 w-10 text-neutral-300 mb-3" />
              <p className="text-neutral-500">No support messages yet</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
              {sortedConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/admin/messages/${conv.id}`)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-neutral-50 transition-colors ${
                    String(conv.id) === id ? 'bg-primary-50' : ''
                  }`}
                >
                  <Avatar name={conv.customer?.name} src={conv.customer?.avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-neutral-900 truncate">
                        {conv.customer?.name || 'Unknown'}
                      </p>
                      <span className="text-xs text-neutral-400 shrink-0">
                        {timeAgo(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <TypeBadge type={conv.type} />
                      {conv.unread_count > 0 && (
                        <Badge tone="danger" className="!py-0.5">{conv.unread_count}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500 truncate mt-1">
                      {conv.latest_message?.body || 'No messages yet'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thread panel */}
        <div
          className={`${id ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-white rounded-2xl shadow-card overflow-hidden`}
        >
          {!id || !activeConversation ? (
            messagesLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <MessageSquare className="h-10 w-10 text-neutral-300 mb-3" />
                <p className="text-neutral-500">Select a conversation to view</p>
              </div>
            )
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-neutral-100">
                <button
                  onClick={() => navigate('/admin/messages')}
                  className="lg:hidden p-2 -ml-2 rounded-lg text-neutral-500 hover:bg-neutral-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar name={activeConversation.customer?.name} src={activeConversation.customer?.avatar} size="h-9 w-9" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 truncate">
                    {activeConversation.customer?.name || 'Unknown'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <TypeBadge type={activeConversation.type} />
                    {activeConversation.subject_type && (
                      <span className="text-xs text-neutral-400">
                        {activeConversation.subject_type} #{activeConversation.subject_id}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-neutral-400 text-sm">
                    No messages yet — say hello.
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMine = message.sender_id === user?.id;
                    return (
                      <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 ${
                            isMine ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-800'
                          }`}
                        >
                          {!isMine && (
                            <p className="text-xs font-semibold text-primary-600 mb-0.5">
                              {message.sender?.name || 'Support'}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                          <p className={`text-[11px] mt-1 ${isMine ? 'text-primary-100' : 'text-neutral-400'}`}>
                            {new Date(message.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="border-t border-neutral-100 p-3 sm:p-4 flex items-end gap-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!replyText.trim() || sending}
                  loading={sending}
                  className="shrink-0"
                >
                  {!sending && <Send className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMessages;
