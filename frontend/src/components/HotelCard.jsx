import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { getHotelImage } from '../utils/images';
import { Card, Badge, RatingStars, WishlistButton } from './ui';
import AddToTripButton from './AddToTripButton';
import useCurrencyStore from '../stores/currencyStore';

/**
 * Shared hotel listing card — used by Hotels.jsx and reused wherever else a
 * compact hotel tile is needed (Home's featured grid, comparison drawer).
 */
const HotelCard = ({
  hotel,
  index = 0,
  isWishlisted = false,
  onToggleWishlist,
  wishlistBusy = false,
  isComparing = false,
  onToggleCompare,
  maxCompareReached = false,
}) => {
  const formatPrice = useCurrencyStore((s) => s.formatPrice);
  return (
  <Card className="flex flex-col">
    <div className="relative aspect-[4/3] overflow-hidden">
      <Link to={`/hotels/${hotel.slug}`}>
        <img
          src={hotel.featured_image || getHotelImage(index)}
          alt={hotel.name}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />
      </Link>
      {onToggleCompare && (
        <label
          className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-full shadow-sm cursor-pointer z-10 hover:bg-white transition"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isComparing}
            onChange={(e) => {
              e.stopPropagation();
              onToggleCompare(hotel.id);
            }}
            disabled={maxCompareReached && !isComparing}
            className="w-3.5 h-3.5 text-primary-600 rounded focus:ring-primary-500"
          />
          <span className="text-xs font-semibold text-neutral-700 hidden sm:inline">Compare</span>
        </label>
      )}
      {onToggleWishlist && (
        <WishlistButton
          active={isWishlisted}
          onClick={(e) => onToggleWishlist(hotel.id, e)}
          disabled={wishlistBusy}
          className="absolute top-3 right-3 z-10"
        />
      )}
      <AddToTripButton
        bookableType="hotel"
        bookableId={hotel.id}
        bookableName={hotel.name}
        variant="icon"
        className="absolute top-3 right-14 z-10"
      />
      {hotel.is_featured && (
        <Badge tone="accent" className="absolute bottom-3 left-3 shadow-sm">
          Featured
        </Badge>
      )}
    </div>
    <Link to={`/hotels/${hotel.slug}`} className="p-4 flex flex-col flex-1">
      <div className="flex items-center text-neutral-500 text-xs mb-1.5">
        <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
        <span className="truncate">{hotel.city}</span>
      </div>
      <h3 className="font-display text-base sm:text-lg font-bold text-neutral-900 group-hover:text-primary-600 transition mb-2 line-clamp-2">
        {hotel.name}
      </h3>
      <div className="flex items-center justify-between mb-3">
        <RatingStars rating={hotel.rating || 4.5} reviewCount={hotel.reviews_count} />
        <Badge tone="neutral">{hotel.star_rating} Star</Badge>
      </div>
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-neutral-100">
        <div>
          <span className="text-lg sm:text-xl font-bold text-primary-600">{formatPrice(hotel.price_per_night)}</span>
          <span className="text-xs text-neutral-500">/night</span>
        </div>
        <span className="text-sm font-semibold text-primary-600 group-hover:underline">View</span>
      </div>
    </Link>
  </Card>
  );
};

export default HotelCard;
