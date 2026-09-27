import { Link } from 'react-router-dom';
import { Compass, MapPin } from 'lucide-react';
import { Card, Badge } from './ui';
import useCurrencyStore from '../stores/currencyStore';

/**
 * "Holiday Package" destination-grid card — image + title + starting price,
 * matching the destination-card pattern competitor OTA holiday-package
 * landing pages use, instead of the previous stacked horizontal list.
 */
const ItineraryCard = ({ itinerary }) => {
  const formatPrice = useCurrencyStore((s) => s.formatPrice);
  return (
  <Card as={Link} to={`/itineraries/${itinerary.slug}`} className="flex flex-col">
    <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
      {itinerary.cover_image ? (
        <img
          src={itinerary.cover_image}
          alt={itinerary.title}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-neutral-100">
          <Compass className="h-12 w-12 text-neutral-300" />
        </div>
      )}
      {itinerary.duration_days && (
        <Badge tone="primary" className="absolute top-3 left-3 shadow-sm">
          {itinerary.duration_days} {itinerary.duration_days === 1 ? 'day' : 'days'}
        </Badge>
      )}
    </div>
    <div className="p-4 flex flex-col flex-1">
      <h3 className="font-display text-base sm:text-lg font-bold text-neutral-900 group-hover:text-primary-600 transition line-clamp-2 mb-1.5">
        {itinerary.title}
      </h3>
      {itinerary.destination_city && (
        <div className="flex items-center text-neutral-500 text-xs mb-2">
          <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
          <span className="truncate">{itinerary.destination_city}</span>
        </div>
      )}
      {itinerary.description && (
        <p className="text-sm text-neutral-600 line-clamp-2 mb-3">{itinerary.description}</p>
      )}
      <div className="mt-auto pt-3 border-t border-neutral-100 flex items-center justify-between">
        <div>
          {itinerary.fixed_price ? (
            <span className="font-price-display text-price-display font-bold text-primary-600">{formatPrice(itinerary.fixed_price)}</span>
          ) : itinerary.price_from ? (
            <span className="font-price-display text-price-display font-bold text-primary-600">From {formatPrice(itinerary.price_from)}</span>
          ) : (
            <span className="text-sm text-neutral-500">Custom pricing</span>
          )}
          {typeof itinerary.items_count === 'number' && (
            <p className="text-xs text-neutral-500 mt-0.5">{itinerary.items_count} {itinerary.items_count === 1 ? 'stop' : 'stops'}</p>
          )}
        </div>
        <span className="text-sm font-semibold text-primary-600 group-hover:underline">View</span>
      </div>
    </div>
  </Card>
  );
};

export default ItineraryCard;
