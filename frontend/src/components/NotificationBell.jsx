import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Loader2, CheckCheck, Check, X } from 'lucide-react';
import useNotificationStore from '../stores/notificationStore';
import { adminAPI, vendorAPI } from '../services/api';
import useAuthStore from '../stores/authStore';

/**
 * Notification bell — used in MainLayout/AdminLayout/VendorLayout headers.
 * The store handles fetching history + live Reverb push; this component is
 * just the bell icon, unread badge, and dropdown list.
 */
const NotificationBell = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const isVendor = useAuthStore((s) => s.user?.role === 'vendor');
  const [open, setOpen] = useState(false);
  const [respondingId, setRespondingId] = useState(null);
  const [handled, setHandled] = useState({});
  const containerRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && notifications.length === 0) {
      fetchNotifications();
    }
  };

  const handleClick = async (notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    const url = notification.data?.action_url;
    setOpen(false);
    if (url) navigate(url);
  };

  // Lets staff accept/decline a fresh booking request right from the bell —
  // no need to open the admin bookings page first, so the reply is instant.
  const respondToRequest = async (e, notification, status) => {
    e.stopPropagation();
    const bookingId = notification.data?.booking_id;
    if (!bookingId || respondingId) return;

    setRespondingId(notification.id);
    try {
      if (notification.data?.booking_kind === 'tour_guide') {
        await adminAPI.updateTourGuideBookingStatus(bookingId, status);
      } else if (isVendor) {
        await vendorAPI.updateBookingStatus(bookingId, { status });
      } else {
        await adminAPI.updateBookingStatus(bookingId, status);
      }
      setHandled((prev) => ({ ...prev, [notification.id]: status }));
      if (!notification.read_at) await markAsRead(notification.id);
    } catch (error) {
      console.error('Error responding to booking request:', error);
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative p-2 rounded-full text-neutral-700 hover:bg-neutral-100 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-card-hover border border-neutral-100 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <h4 className="font-display font-semibold text-neutral-900 text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-8 px-4">You're all caught up — no notifications yet.</p>
            ) : (
              notifications.map((n) => {
                const isBookingRequest = n.data?.type === 'new_booking_request'
                  && ['booking', 'tour_guide'].includes(n.data?.booking_kind);
                const resolvedAs = handled[n.id];

                return (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleClick(n)}
                    onKeyDown={(e) => e.key === 'Enter' && handleClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 transition-colors cursor-pointer ${
                      !n.read_at ? 'bg-primary-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read_at && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary-500 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-900 truncate">{n.data?.title}</p>
                        <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5">{n.data?.message}</p>
                        <p className="text-[11px] text-neutral-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>

                        {isBookingRequest && (
                          <div className="mt-2">
                            {resolvedAs ? (
                              <span className="text-[11px] font-medium text-primary-600">
                                {resolvedAs === 'confirmed' ? 'Accepted' : 'Declined'}
                              </span>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={respondingId === n.id}
                                  onClick={(e) => respondToRequest(e, n, 'confirmed')}
                                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                                >
                                  <Check className="h-3 w-3" /> Accept
                                </button>
                                <button
                                  type="button"
                                  disabled={respondingId === n.id}
                                  onClick={(e) => respondToRequest(e, n, 'cancelled')}
                                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                                >
                                  <X className="h-3 w-3" /> Decline
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
