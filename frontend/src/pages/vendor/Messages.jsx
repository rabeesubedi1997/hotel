import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Send, MessageSquare, ArrowLeft } from 'lucide-react';
import useChatStore from '../../stores/chatStore';
import useAuthStore from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui';

const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
};

const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
};

const formatMessageTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Best-effort "About: <Type> #<id>" label from subject_type/subject_id — the
// conversation payload doesn't include the actual listing name, just its
// polymorphic type + id.
const getSubjectLabel = (conversation) => {
  const { subject_type: subjectType, subject_id: subjectId } = conversation || {};
  if (!subjectType || !subjectId) return null;
  let label = subjectType.split('\\').pop();
  if (subjectType.includes('Hotel')) label = 'Hotel';
  else if (subjectType.includes('Activity')) label = 'Activity';
  else if (subjectType.includes('TourGuide')) label = 'Tour Guide';
  return `${label} #${subjectId}`;
};

const Avatar = ({ name, avatar, size = 'md' }) => {
  const dimensions = size === 'sm' ? 'h-10 w-10 text-sm' : 'h-12 w-12 text-base';
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name || 'User'}
        className={`${dimensions} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${dimensions} rounded-full bg-primary-100 text-primary-700 font-semibold flex items-center justify-center flex-shrink-0`}>
      {getInitials(name)}
    </div>
  );
};

const VendorMessages = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore((state) => state.user);

  const conversations = useChatStore((state) => state.conversations);
  const conversationsLoading = useChatStore((state) => state.conversationsLoading);
  const fetchConversations = useChatStore((state) => state.fetchConversations);
  const activeConversation = useChatStore((state) => state.activeConversation);
  const messages = useChatStore((state) => state.messages);
  const messagesLoading = useChatStore((state) => state.messagesLoading);
  const openConversation = useChatStore((state) => state.openConversation);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const closeConversation = useChatStore((state) => state.closeConversation);

  const [messageText, setMessageText] = useState('');
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
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const body = messageText.trim();
    if (!body || sending || !activeConversation) return;

    setSending(true);
    const result = await sendMessage(activeConversation.id, body);
    setSending(false);

    if (result.success) {
      setMessageText('');
    } else {
      toast.error(result.error || 'Failed to send message');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="p-6">
      <h1 className="font-display text-2xl font-bold text-neutral-900 mb-6">Messages</h1>

      <div className="flex h-[calc(100vh-220px)] min-h-[480px] bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        {/* Conversation list */}
        <div className={`${id ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 lg:w-96 flex-shrink-0 flex-col border-r border-neutral-200`}>
          <div className="px-4 py-3 border-b border-neutral-200">
            <h2 className="font-display font-semibold text-neutral-900">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-neutral-500 text-sm">Loading conversations...</div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                <MessageSquare className="h-10 w-10 text-neutral-300 mb-3" />
                <p className="text-neutral-500 font-medium">No customer messages yet</p>
                <p className="text-neutral-400 text-sm mt-1">
                  Messages from customers about your listings will show up here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {conversations.map((conversation) => {
                  const isActive = String(conversation.id) === String(id);
                  const isUnread = conversation.unread_count > 0;
                  const subjectLabel = getSubjectLabel(conversation);

                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/vendor/messages/${conversation.id}`)}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-neutral-50 transition-colors ${
                          isActive ? 'bg-primary-50 hover:bg-primary-50' : ''
                        }`}
                      >
                        <Avatar name={conversation.customer?.name} avatar={conversation.customer?.avatar} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`truncate text-sm ${isUnread ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-800'}`}>
                              {conversation.customer?.name || 'Customer'}
                            </p>
                            <span className="text-xs text-neutral-400 flex-shrink-0">
                              {formatRelativeTime(conversation.last_message_at)}
                            </span>
                          </div>
                          {subjectLabel && (
                            <p className="text-xs text-neutral-400 truncate mt-0.5">About: {subjectLabel}</p>
                          )}
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className={`truncate text-sm ${isUnread ? 'text-neutral-700 font-medium' : 'text-neutral-500'}`}>
                              {conversation.latest_message?.body || 'No messages yet'}
                            </p>
                            {isUnread && (
                              <span className="flex-shrink-0 inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full bg-primary-600 text-white text-xs font-semibold">
                                {conversation.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Active thread */}
        <div className={`${id ? 'flex' : 'hidden sm:flex'} flex-1 flex-col min-w-0`}>
          {!id || !activeConversation ? (
            <div className="flex-1 flex items-center justify-center">
              {messagesLoading ? (
                <div className="text-neutral-500 text-sm">Loading conversation...</div>
              ) : (
                <div className="text-center px-6">
                  <MessageSquare className="h-10 w-10 text-neutral-300 mb-3 mx-auto" />
                  <p className="text-neutral-500">Select a conversation</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b border-neutral-200 flex items-center gap-3">
                <Link to="/vendor/messages" className="sm:hidden text-neutral-500 hover:text-neutral-700">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <Avatar name={activeConversation.customer?.name} avatar={activeConversation.customer?.avatar} size="sm" />
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900 truncate">{activeConversation.customer?.name || 'Customer'}</p>
                  {getSubjectLabel(activeConversation) && (
                    <p className="text-xs text-neutral-400 truncate">About: {getSubjectLabel(activeConversation)}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-neutral-50">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-neutral-500 text-sm">Loading messages...</div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-neutral-400 text-sm">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMine = message.sender_id === user?.id;
                    return (
                      <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] sm:max-w-[65%] rounded-2xl px-4 py-2 ${
                          isMine
                            ? 'bg-primary-600 text-white rounded-br-sm'
                            : 'bg-white text-neutral-800 border border-neutral-200 rounded-bl-sm'
                        }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                          <p className={`text-[11px] mt-1 ${isMine ? 'text-primary-100' : 'text-neutral-400'}`}>
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <form onSubmit={handleSend} className="border-t border-neutral-200 p-3 flex items-end gap-2">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 max-h-32"
                />
                <Button type="submit" variant="primary" disabled={!messageText.trim()} loading={sending}>
                  <Send className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorMessages;
