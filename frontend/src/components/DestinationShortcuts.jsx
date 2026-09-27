import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { hotelsAPI, activitiesAPI } from '../services/api';
import DestinationCard from './DestinationCard';

const SOURCES = {
  hotels: { api: hotelsAPI, param: 'city', to: '/hotels' },
  activities: { api: activitiesAPI, param: 'city', to: '/activities' },
};

/**
 * "Popular Destinations" band — one row of real cities pulled from live
 * listings (via /hotels/destinations or /activities/destinations), each
 * tagged with its cheapest current price. Clicking a card jumps straight
 * into the matching listing page pre-filtered by city.
 */
const DestinationShortcuts = ({ type = 'hotels', title = 'Popular Destinations', limit = 8, className = '' }) => {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const source = SOURCES[type] || SOURCES.hotels;

  useEffect(() => {
    let cancelled = false;
    source.api.getDestinations()
      .then((res) => {
        if (cancelled) return;
        setDestinations((res.data || []).filter((d) => d.city).slice(0, limit));
      })
      .catch(() => !cancelled && setDestinations([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  if (!loading && destinations.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-4 w-4 text-primary-600" />
        <h3 className="font-display text-base sm:text-lg font-bold text-neutral-900">{title}</h3>
      </div>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-40 sm:w-48 h-32 sm:h-40 shrink-0 rounded-2xl bg-neutral-100 animate-pulse" />
            ))
          : destinations.map((d) => (
              <div key={d.city} className="w-40 sm:w-48 shrink-0 snap-start">
                <DestinationCard
                  name={d.city}
                  priceFrom={d.price_from}
                  listingsCount={d.listings_count}
                  onClick={() => navigate(`${source.to}?${source.param}=${encodeURIComponent(d.city)}`)}
                />
              </div>
            ))}
      </div>
    </div>
  );
};

export default DestinationShortcuts;
