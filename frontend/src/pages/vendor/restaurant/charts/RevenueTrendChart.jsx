import { useId } from 'react';

/**
 * Lightweight SVG area/line chart for the daily revenue trend — no charting
 * library dependency, just plotted points from real report data
 * (ReportController::earnings' revenue_by_day, zero-filled per day).
 */
const RevenueTrendChart = ({ data, height = 180 }) => {
  const gradientId = useId();
  const width = 600;
  const padding = { top: 12, right: 12, bottom: 24, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const max = Math.max(...data.map((d) => d.total), 1);
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + innerH - (d.total / max) * innerH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? 0} ${padding.top + innerH} L ${points[0]?.x ?? 0} ${padding.top + innerH} Z`;

  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  if (data.every((d) => d.total === 0)) {
    return <p className="text-body-sm text-neutral-500 py-12 text-center">No revenue in this period.</p>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3fb69c" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3fb69c" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke="#005f50" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={p.date} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 0} fill="#005f50" />
      ))}
      {points.map((p, i) => (
        i % labelEvery === 0 && (
          <text key={p.date} x={p.x} y={height - 6} fontSize="10" fill="#6e7a75" textAnchor="middle">
            {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </text>
        )
      ))}
    </svg>
  );
};

export default RevenueTrendChart;
