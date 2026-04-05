import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, Hotel, Compass, Loader2 } from 'lucide-react';
import { wishlistsAPI } from '../services/api';

const Wishlist = () => {
  const [wishlists, setWishlists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlists();
  }, []);

  const fetchWishlists = async () => {
    try {
      const response = await wishlistsAPI.getAll();
      setWishlists(response.data.data);
    } catch (error) {
      console.error('Error fetching wishlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (id) => {
    try {
      await wishlistsAPI.remove(id);
      setWishlists(wishlists.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Wishlist</h1>

      {wishlists.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Your wishlist is empty</h3>
          <p className="text-gray-500 mt-2">Save items you love and book them later!</p>
          <div className="mt-6 flex justify-center space-x-4">
            <Link to="/hotels" className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700">
              Browse Hotels
            </Link>
            <Link to="/activities" className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-50">
              Explore Activities
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {wishlists.map((item) => {
            const wishlistable = item.wishlistable;
            const isHotel = item.wishlistable_type === 'App\\Models\\Hotel';
            const linkPath = isHotel ? `/hotels/${wishlistable?.slug}` : `/activities/${wishlistable?.slug}`;

            return (
              <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <Link to={linkPath}>
                  <div className="h-48 bg-gray-200">
                    {wishlistable?.featured_image ? (
                      <img
                        src={wishlistable.featured_image}
                        alt={wishlistable.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        {isHotel ? (
                          <Hotel className="h-12 w-12 text-gray-400" />
                        ) : (
                          <Compass className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs text-primary-600 font-medium">
                        {isHotel ? 'Hotel' : 'Activity'}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900 mt-1">{wishlistable?.name}</h3>
                      <p className="text-gray-600 text-sm">{wishlistable?.city}</p>
                    </div>
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-primary-600 font-semibold">
                      ${isHotel ? wishlistable?.price_per_night : wishlistable?.price}
                    </span>
                    <Link
                      to={linkPath}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
