import { CHANNEL_LABEL } from '../constants';

const COLORS = ['#005f50', '#216293', '#a55800', '#3fb69c', '#8ec6fd'];

/**
 * SVG donut for the Direct/UberEats/DoorDash revenue split — built from
 * real revenue_by_channel data (ReportController::earnings), plotted via
 * plain stroke-dasharray arcs rather than a charting library.
 */
const ChannelDonut = ({ data }) => {
  const total = data.reduce((sum, d) => sum + Number(d.total), 0);
  if (total === 0) {
    return <p className="text-body-sm text-neutral-500 py-8 text-center">No revenue in this period.</p>;
  }

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="w-36 h-36 shrink-0 -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#e7eeff" strokeWidth="20" />
        {data.map((d, i) => {
          const fraction = Number(d.total) / total;
          const dash = fraction * circumference;
          const circle = (
            <circle
              key={d.channel || i}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="20"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return circle;
        })}
      </svg>
      <div className="space-y-2 flex-1 min-w-0">
        {data.map((d, i) => (
          <div key={d.channel || i} className="flex items-center justify-between gap-3 text-body-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-outline truncate">{CHANNEL_LABEL[d.channel] || d.channel || 'Direct'}</span>
            </span>
            <span className="font-semibold text-on-surface shrink-0">{Math.round((Number(d.total) / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChannelDonut;
