import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, UtensilsCrossed, ArrowRight } from 'lucide-react';
import { vendorAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Badge } from '../../components/ui';

// Restaurant POS is scoped per hotel (menu/tables/orders all belong to one
// hotel), so the sidebar's "Restaurant POS" link lands here first to pick
// which hotel, then hands off to /vendor/hotels/:id/restaurant.
const VendorRestaurantSelect = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vendorAPI.getHotels()
      .then((res) => setHotels(res.data || []))
      .catch((error) => {
        console.error('Failed to load hotels', error);
        toast.error('Failed to load hotels');
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
      <p className="text-sm text-neutral-500 mb-6">Choose a hotel to manage its menu, tables, and kitchen orders.</p>

      {hotels.length === 0 ? (
        <p className="text-center text-neutral-500 py-12">You don't have any hotels yet. Add one under "My Hotels" first.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotels.map((hotel) => (
            <button
              key={hotel.id}
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
  );
};

export default VendorRestaurantSelect;
