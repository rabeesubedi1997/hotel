import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Loader2, UtensilsCrossed, ArrowRight, Building2, Mountain } from 'lucide-react';
import { vendorAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import useAuthStore from '../../stores/authStore';
import { Badge } from '../../components/ui';

// Restaurant POS is scoped per owner (menu/tables/orders all belong to one
// hotel OR one activity), so the sidebar's "Restaurant POS" link lands here
// first to pick which one, then hands off to /vendor/hotels/:id/restaurant
// or /vendor/activities/:id/restaurant. A Kitchen Staff login owns nothing
// (getHotels/getActivities come back empty for them) — kitchenAccess is
// their RestaurantStaff-granted properties instead, and if that's their
// only option, skip the picker and go straight there.
const VendorRestaurantSelect = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasAnyPermission } = useAuthStore();
  const isKitchenOnly = !hasAnyPermission(['hotels.edit.own', 'activities.edit.own'])
    && hasAnyPermission(['restaurant.kitchen.view', 'restaurant.kitchen.manage']);
  const [hotels, setHotels] = useState([]);
  const [activities, setActivities] = useState([]);
  const [kitchenAccess, setKitchenAccess] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([vendorAPI.getHotels(), vendorAPI.getActivities(), vendorAPI.getMyKitchenAccess()])
      .then(([hotelsRes, activitiesRes, kitchenRes]) => {
        const hotelList = hotelsRes.data || [];
        const activityList = activitiesRes.data || [];
        const kitchenList = kitchenRes.data || [];
        setHotels(hotelList);
        setActivities(activityList);
        setKitchenAccess(kitchenList);

        if (isKitchenOnly && kitchenList.length === 1 && hotelList.length === 0 && activityList.length === 0) {
          navigate(`/vendor/${kitchenList[0].owner_type === 'activity' ? 'activities' : 'hotels'}/${kitchenList[0].owner_id}/restaurant`, { replace: true });
        }
      })
      .catch((error) => {
        console.error('Failed to load hotels/activities', error);
        toast.error('Failed to load hotels/activities');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-neutral-900 mb-2">Restaurant POS</h2>
      <p className="text-sm text-neutral-500 mb-6">Choose a hotel or activity to manage its menu, tables, and kitchen orders.</p>

      {kitchenAccess.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <ChefHat className="h-4 w-4 text-neutral-400" />
            <h3 className="font-display text-lg font-bold text-neutral-900">Kitchen Access</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kitchenAccess.map((grant) => (
              <button
                key={`kitchen-${grant.id}`}
                onClick={() => navigate(`/vendor/${grant.owner_type === 'activity' ? 'activities' : 'hotels'}/${grant.owner_id}/restaurant`)}
                className="text-left bg-white rounded-xl border border-neutral-100 shadow-sm p-5 hover:border-primary-300 hover:shadow-md transition-all"
              >
                <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center mb-2">
                  <ChefHat className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-3">{grant.owner_name || 'Kitchen'}</h3>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600">
                  Open Kitchen Display <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {hotels.length === 0 && activities.length === 0 ? (
        isKitchenOnly ? (
          kitchenAccess.length === 0 && (
            <p className="text-center text-neutral-500 py-12">No kitchen access has been granted to your account yet — ask the property owner to add you under Kitchen Staff.</p>
          )
        ) : (
          <p className="text-center text-neutral-500 py-12">You don&apos;t have any hotels or activities yet. Add one first.</p>
        )
      ) : (
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-neutral-400" />
              <h3 className="font-display text-lg font-bold text-neutral-900">Hotels</h3>
            </div>
            {hotels.length === 0 ? (
              <p className="text-sm text-neutral-500">No hotels yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {hotels.map((hotel) => (
                  <button
                    key={`hotel-${hotel.id}`}
                    onClick={() => navigate(`/vendor/hotels/${hotel.id}/restaurant`)}
                    className="text-left bg-white rounded-xl border border-neutral-100 shadow-sm p-5 hover:border-primary-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
                        <UtensilsCrossed className="h-5 w-5 text-orange-600" />
                      </div>
                      <Badge status={hotel.approval_status || 'pending'} />
                    </div>
                    <h3 className="font-semibold text-neutral-900 mb-1">{hotel.name}</h3>
                    <p className="text-sm text-neutral-500 mb-3">{hotel.city}</p>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600">
                      Open Restaurant POS <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Mountain className="h-4 w-4 text-neutral-400" />
              <h3 className="font-display text-lg font-bold text-neutral-900">Activities</h3>
            </div>
            {activities.length === 0 ? (
              <p className="text-sm text-neutral-500">No activities yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activities.map((activity) => (
                  <button
                    key={`activity-${activity.id}`}
                    onClick={() => navigate(`/vendor/activities/${activity.id}/restaurant`)}
                    className="text-left bg-white rounded-xl border border-neutral-100 shadow-sm p-5 hover:border-primary-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
                        <Mountain className="h-5 w-5 text-orange-600" />
                      </div>
                      <Badge status={activity.approval_status || 'pending'} />
                    </div>
                    <h3 className="font-semibold text-neutral-900 mb-1">{activity.name}</h3>
                    <p className="text-sm text-neutral-500 mb-3">{activity.city || activity.location}</p>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600">
                      Open Restaurant POS <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorRestaurantSelect;
