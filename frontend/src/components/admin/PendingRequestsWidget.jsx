import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlarmClock, Check, X, Inbox } from 'lucide-react';
import { adminAPI } from '../../services/api';

const formatCountdown = (dueAt, now) => {
  if (!dueAt) return null;
  const diffMs = new Date(dueAt).getTime() - now;
  const overdue = diffMs < 0;
  const totalSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const label = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  return { overdue, label };
};

/**
 * Instant-booking queue: every pending booking/hire request, oldest first,
 * with a live countdown to its response SLA so staff can see at a glance
 * what needs a reply right now — the dashboard-level view of the same
 * requests the notification bell already pushed out instantly.
 */
const PendingRequestsWidget = ({ requests, onResponded }) => {
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [respondingId, setRespondingId] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const respond = async (request, status) => {
    const key = `${request.kind}-${request.id}`;
    setRespondingId(key);
    try {
      if (request.kind === 'tour_guide') {
        await adminAPI.updateTourGuideBookingStatus(request.id, status);
      } else {
        await adminAPI.updateBookingStatus(request.id, status);
      }
      onResponded?.();
    } catch (error) {
      console.error('Error responding to request:', error);
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold text-neutral-900 flex items-center gap-2">
          <AlarmClock className="h-5 w-5 text-primary-600" />
          Pending Requests
        </h2>
        {requests.length > 0 && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary-50 text-primary-700">
            {requests.length} awaiting reply
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-8">
          <Inbox className="h-10 w-10 mx-auto mb-2 text-neutral-300" />
          <p className="text-neutral-500">You're all caught up — no pending requests.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((request) => {
            const key = `${request.kind}-${request.id}`;
            const countdown = formatCountdown(request.response_due_at, now);
            return (
              <div
                key={key}
                onClick={() => navigate(request.action_url)}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {request.guest_name || 'A guest'} — {request.item_name || 'a listing'}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {request.reference}
                    {countdown && (
                      <span className={`ml-2 font-medium ${countdown.overdue ? 'text-red-600' : 'text-amber-600'}`}>
                        {countdown.overdue ? `Overdue by ${countdown.label}` : `${countdown.label} left`}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={respondingId === key}
                    onClick={(e) => {
                      e.stopPropagation();
                      respond(request, 'confirmed');
                    }}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Accept
                  </button>
                  <button
                    type="button"
                    disabled={respondingId === key}
                    onClick={(e) => {
                      e.stopPropagation();
                      respond(request, 'cancelled');
                    }}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link to="/admin/bookings" className="text-primary-600 font-medium hover:text-primary-700 mt-4 inline-block text-sm">
        View All Bookings →
      </Link>
    </div>
  );
};

export default PendingRequestsWidget;
