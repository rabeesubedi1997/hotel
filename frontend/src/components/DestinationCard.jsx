import { getDestinationImage } from '../utils/images';
import useCurrencyStore from '../stores/currencyStore';

/**
 * "Popular destination" shortcut tile — image + place name + starting price,
 * mirroring the destination-card band competitor OTA sites (e.g. Sasto
 * Tickets' "Popular Destinations" / "Your Popular Picks") show under their
 * search bars. Purely a link-out card; the parent decides where it navigates.
 */
const DestinationCard = ({ name, priceFrom, listingsCount, image, onClick, size = 'md' }) => {
  const formatPrice = useCurrencyStore((s) => s.formatPrice);
  const heightClass = size === 'lg' ? 'h-44 sm:h-52' : 'h-32 sm:h-40';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full ${heightClass} shrink-0 rounded-2xl overflow-hidden text-left shadow-card hover:shadow-card-hover transition-all hover:-translate-y-0.5`}
    >
      <img
        src={image || getDestinationImage(name)}
        alt={name}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/85 via-neutral-900/15 to-transparent" />
      <div className="relative h-full flex flex-col justify-end p-3.5 sm:p-4">
        <span className="font-display text-sm sm:text-base font-bold text-white leading-tight truncate">
          {name}
        </span>
        {priceFrom ? (
          <span className="text-xs sm:text-sm text-white/85 mt-0.5">
            From <span className="font-semibold text-white">{formatPrice(priceFrom)}</span>
          </span>
        ) : listingsCount ? (
          <span className="text-xs sm:text-sm text-white/85 mt-0.5">{listingsCount} listed</span>
        ) : null}
      </div>
    </button>
  );
};

export default DestinationCard;
