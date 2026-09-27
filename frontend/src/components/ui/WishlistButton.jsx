import { Heart } from 'lucide-react';

/**
 * Airbnb-style wishlist heart overlay for listing cards. Purely
 * presentational — pass `active` + `onClick`; pages keep owning the
 * wishlistsAPI calls (see Hotels.jsx's toggleWishlist for the pattern).
 */
const WishlistButton = ({ active, onClick, className = '', size = 'md', disabled = false }) => {
  const box = size === 'sm' ? 'p-1.5' : 'p-2';
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={active}
      className={`${box} rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors shadow-sm
        disabled:opacity-50 disabled:cursor-wait ${className}`}
    >
      <Heart
        className={`${icon} transition-colors ${
          active ? 'text-accent-500 fill-accent-500' : 'text-neutral-700'
        }`}
      />
    </button>
  );
};

export default WishlistButton;
