const TONES = {
  primary: 'bg-primary-500',
  accent: 'bg-accent-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  neutral: 'bg-neutral-700',
};

/**
 * Dashboard stat tile — used on the admin/vendor dashboards in place of the
 * old hand-rolled `<div className="bg-white rounded-lg shadow-md p-6">...`
 * block that was duplicated in both Dashboard pages.
 *
 *   <StatCard icon={Calendar} title="Total Bookings" value={42} tone="primary" />
 */
const StatCard = ({ icon: Icon, title, value, tone = 'primary', hint }) => (
  <div className="bg-white rounded-2xl shadow-card p-6 flex items-center">
    <div className={`p-3 rounded-xl ${TONES[tone] || TONES.primary} shrink-0`}>
      {Icon && <Icon className="h-6 w-6 text-white" />}
    </div>
    <div className="ml-4 min-w-0">
      <p className="text-sm text-neutral-500 truncate">{title}</p>
      <p className="font-display text-2xl font-bold text-neutral-900">{value}</p>
      {hint && <p className="text-xs text-neutral-400 mt-0.5">{hint}</p>}
    </div>
  </div>
);

export default StatCard;
