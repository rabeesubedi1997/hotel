import { Star } from 'lucide-react';

/**
 * Consistent star-rating display, used on hotel/activity/tour-guide cards
 * and detail pages instead of each page rendering its own star markup.
 */
const RatingStars = ({ rating = 0, reviewCount, size = 'sm', showValue = true, className = '' }) => {
  const value = Number(rating) || 0;
  const iconSize = size === 'lg' ? 'h-5 w-5' : size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  const textSize = size === 'lg' ? 'text-base' : size === 'md' ? 'text-sm' : 'text-xs';

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Star className={`${iconSize} text-amber-400 fill-amber-400`} />
      {showValue && <span className={`font-semibold text-neutral-800 ${textSize}`}>{value.toFixed(1)}</span>}
      {typeof reviewCount === 'number' && (
        <span className={`text-neutral-500 ${textSize}`}>({reviewCount})</span>
      )}
    </span>
  );
};

export default RatingStars;
