import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, ChefHat, Grid3x3, Loader2, UtensilsCrossed } from 'lucide-react';
import { Tabs } from '../../components/ui';
import { RestaurantProvider, useRestaurant } from './restaurant/context/RestaurantContext';
import RestaurantKitchen from './restaurant/RestaurantKitchen';
import RestaurantMenu from './restaurant/RestaurantMenu';
import RestaurantTables from './restaurant/RestaurantTables';
import RestaurantReports from './restaurant/RestaurantReports';

const TABS = [
  { key: 'kitchen', label: 'Kitchen', icon: ChefHat },
  { key: 'menu', label: 'Menu', icon: UtensilsCrossed },
  { key: 'tables', label: 'Tables', icon: Grid3x3 },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
];

/**
 * Restaurant POS is owned by either a hotel or an activity — same page,
 * same API shape, just a different owner id/type depending on which route
 * rendered it. All actual data/state lives in RestaurantProvider; this
 * shell just resolves the owner and switches between the four tabs.
 */
const VendorRestaurant = () => {
  const { hotelId, activityId } = useParams();
  const ownerType = activityId ? 'activity' : 'hotel';
  const ownerId = activityId || hotelId;

  return (
    <RestaurantProvider ownerType={ownerType} ownerId={ownerId}>
      <RestaurantShell />
    </RestaurantProvider>
  );
};

const RestaurantShell = () => {
  const navigate = useNavigate();
  const { ownerType, owner, loading, isApproved } = useRestaurant();
  const [tab, setTab] = useState('kitchen');
  const backLink = ownerType === 'activity' ? '/vendor/activities' : '/vendor/hotels';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate(backLink)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 mb-3 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {ownerType === 'activity' ? 'My Activities' : 'My Hotels'}
      </button>
      <h2 className="font-display text-2xl font-bold text-neutral-900 mb-2">
        Restaurant POS {owner ? `— ${owner.name}` : ''}
      </h2>

      {!isApproved && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 mb-4">
          This {ownerType} is pending admin verification — menu, table, and order changes unlock once it&apos;s approved. You can still view existing data below.
        </div>
      )}

      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-6" />

      {tab === 'kitchen' && <RestaurantKitchen />}
      {tab === 'menu' && <RestaurantMenu />}
      {tab === 'tables' && <RestaurantTables />}
      {tab === 'reports' && <RestaurantReports />}
    </div>
  );
};

export default VendorRestaurant;
