import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { getActivityImage } from '../utils/images';
import { Card, Badge } from './ui';
import AddToTripButton from './AddToTripButton';
import useCurrencyStore from '../stores/currencyStore';

const DIFFICULTY_TONE = { easy: 'success', moderate: 'warning', challenging: 'accent', extreme: 'danger' };

/**
 * Shared activity listing card — used by Activities.jsx and reused wherever
 * else a compact activity tile is needed (Home's featured grid).
 */
const ActivityCard = ({ activity, perPersonLabel = '', maxParticipantsLabel }) => {
  const formatPrice = useCurrencyStore((s) => s.formatPrice);
  return (
  <Card as={Link} to={`/activities/${activity.slug}`} className="flex flex-col">
    <div className="relative aspect-[4/3] overflow-hidden">
      <img
        src={activity.featured_image || getActivityImage(activity.type)}
        alt={activity.name}
        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
      />
      <Badge tone={DIFFICULTY_TONE[activity.difficulty_level] || 'neutral'} className="absolute top-3 right-3 shadow-sm capitalize">
        {activity.difficulty_level}
      </Badge>
      <AddToTripButton
        bookableType="activity"
        bookableId={activity.id}
        bookableName={activity.name}
        variant="icon"
        className="absolute top-3 left-3 z-10"
      />
    </div>
    <div className="p-4 flex flex-col flex-1">
      <Badge tone="primary" className="self-start mb-2 uppercase">
        {activity.type}
      </Badge>
      <h3 className="font-display text-base sm:text-lg font-bold text-neutral-900 group-hover:text-primary-600 transition line-clamp-2 mb-2">
        {activity.name}
      </h3>
      <div className="flex items-center text-neutral-500 text-xs sm:text-sm mb-3">
        <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
        <span className="truncate">{activity.location}</span>
      </div>
      <div className="mt-auto pt-3 border-t border-neutral-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-lg font-bold text-primary-600">
            {formatPrice(activity.price)}
            <span className="text-xs font-normal text-neutral-500">{perPersonLabel}</span>
          </p>
          <span className="text-xs sm:text-sm text-neutral-500">{activity.duration}</span>
        </div>
        <p className="text-xs text-neutral-500">
          {maxParticipantsLabel || `Max ${activity.max_participants} participants`}
        </p>
      </div>
    </div>
  </Card>
  );
};

export default ActivityCard;
