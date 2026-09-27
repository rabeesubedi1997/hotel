const TONES = {
  neutral: 'bg-neutral-100 text-neutral-700',
  primary: 'bg-primary-100 text-primary-700',
  accent: 'bg-accent-50 text-accent-600',
  info: 'bg-secondary-100 text-secondary-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
};

// Maps common backend status strings (approval_status, booking status, etc.)
// to a sensible tone so admin/vendor screens don't each invent their own
// pending/approved/rejected color mapping.
const STATUS_TONE = {
  pending: 'warning',
  approved: 'success',
  confirmed: 'success',
  published: 'success',
  active: 'success',
  rejected: 'danger',
  cancelled: 'danger',
  refunded: 'danger',
  inactive: 'neutral',
  draft: 'neutral',
  preparing: 'info',
  ready: 'primary',
  served: 'success',
  completed: 'success',
  available: 'success',
  occupied: 'warning',
  reserved: 'info',
};

const Badge = ({ tone, status, children, className = '' }) => {
  const resolvedTone = tone || STATUS_TONE[String(status).toLowerCase()] || 'neutral';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${TONES[resolvedTone]} ${className}`}
    >
      {children ?? status}
    </span>
  );
};

export default Badge;
