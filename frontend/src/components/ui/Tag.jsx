const TONES = {
  neutral: 'bg-white text-neutral-500 border-neutral-200',
  danger: 'bg-red-50 text-red-600 border-red-100',
  dark: 'bg-neutral-900/80 text-white border-transparent',
};

/**
 * Small uppercase pill for compact metadata (allergens, kitchen station,
 * channel labels) — distinct from Badge, which is for status/tone chips.
 *
 *   <Tag>gluten</Tag>
 *   <Tag tone="danger">gluten</Tag>
 */
const Tag = ({ tone = 'neutral', children, className = '' }) => (
  <span
    className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${TONES[tone]} ${className}`}
  >
    {children}
  </span>
);

export default Tag;
