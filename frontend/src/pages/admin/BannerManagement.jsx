import { useState, useEffect } from 'react';
import { Image, GripVertical, ArrowUp, ArrowDown, Eye, EyeOff, Star, Loader2, Save } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { getHotelImage, getActivityImage } from '../../utils/images';

const BannerManagement = () => {
  const [hotels, setHotels] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('hotels');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hotelsRes, activitiesRes] = await Promise.all([
        adminAPI.getHotels({ per_page: 100 }),
        adminAPI.getActivities({ per_page: 100 }),
      ]);
      setHotels(hotelsRes.data.data || []);
      setActivities(activitiesRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const toggleBanner = async (item, type) => {
    try {
      if (type === 'hotel') {
        await adminAPI.toggleHotelBanner(item.id);
        setHotels(hotels.map(h => 
          h.id === item.id ? { ...h, show_in_banner: !h.show_in_banner } : h
        ));
      } else {
        await adminAPI.toggleActivityBanner(item.id);
        setActivities(activities.map(a => 
          a.id === item.id ? { ...a, show_in_banner: !a.show_in_banner } : a
        ));
      }
      setMessage(`${item.name} banner status updated`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error toggling banner:', error);
      setMessage('Error updating banner status');
    }
  };

  const updateOrder = async (item, type, newOrder) => {
    try {
      if (type === 'hotel') {
        await adminAPI.updateHotelBannerOrder(item.id, newOrder);
        setHotels(hotels.map(h => 
          h.id === item.id ? { ...h, banner_order: newOrder } : h
        ));
      } else {
        await adminAPI.updateActivityBannerOrder(item.id, newOrder);
        setActivities(activities.map(a => 
          a.id === item.id ? { ...a, banner_order: newOrder } : a
        ));
      }
      setMessage('Order updated');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating order:', error);
      setMessage('Error updating order');
    }
  };

  const moveItem = (item, type, direction) => {
    const currentOrder = item.banner_order || 0;
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
    if (newOrder >= 0) {
      updateOrder(item, type, newOrder);
    }
  };

  const bannerHotels = hotels.filter(h => h.show_in_banner).sort((a, b) => (a.banner_order || 0) - (b.banner_order || 0));
  const bannerActivities = activities.filter(a => a.show_in_banner).sort((a, b) => (a.banner_order || 0) - (b.banner_order || 0));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Banner Management</h2>
        {message && (
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-md">
            {message}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Hotels in Banner</p>
              <p className="text-3xl font-bold text-primary-600">{bannerHotels.length}</p>
            </div>
            <Image className="h-10 w-10 text-gray-400" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Activities in Banner</p>
              <p className="text-3xl font-bold text-primary-600">{bannerActivities.length}</p>
            </div>
            <Star className="h-10 w-10 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('hotels')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'hotels'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Hotels ({bannerHotels.length} in banner)
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'activities'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Activities ({bannerActivities.length} in banner)
          </button>
        </nav>
      </div>

      {/* Banner Items (Ordered) */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">
            {activeTab === 'hotels' ? 'Hotels in Banner Sequence' : 'Activities in Banner Sequence'}
          </h3>
          <p className="text-sm text-gray-500">
            Drag items to reorder or use arrows. Items appear in this order on the homepage banner.
          </p>
        </div>
        
        {(activeTab === 'hotels' ? bannerHotels : bannerActivities).length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No {activeTab} added to banner yet. Toggle items below to add them.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {(activeTab === 'hotels' ? bannerHotels : bannerActivities).map((item, index) => (
              <div key={item.id} className="flex items-center px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center space-x-4 flex-1">
                  <span className="text-gray-400 font-mono w-6">{index + 1}</span>
                  <img 
                    src={item.featured_image || (activeTab === 'hotels' ? getHotelImage(item.id) : getActivityImage(item.type))} 
                    alt={item.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.city || item.location}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => moveItem(item, activeTab.slice(0, -1), 'up')}
                    disabled={index === 0}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ArrowUp className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => moveItem(item, activeTab.slice(0, -1), 'down')}
                    disabled={index === (activeTab === 'hotels' ? bannerHotels : bannerActivities).length - 1}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ArrowDown className="h-5 w-5" />
                  </button>
                  <div className="border-l pl-2 ml-2">
                    <span className="text-sm text-gray-400">Order: {item.banner_order || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Items List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">
            All {activeTab === 'hotels' ? 'Hotels' : 'Activities'}
          </h3>
          <p className="text-sm text-gray-500">Toggle items to show/hide in banner</p>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">In Banner</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(activeTab === 'hotels' ? hotels : activities).map((item) => (
                <tr key={item.id} className={item.show_in_banner ? 'bg-primary-50' : ''}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <img 
                        src={item.featured_image || (activeTab === 'hotels' ? getHotelImage(item.id) : getActivityImage(item.type))} 
                        alt={item.name}
                        className="h-10 w-10 rounded-lg object-cover mr-3"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.is_featured && (
                          <span className="text-xs text-primary-600">Featured</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.city || item.location}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleBanner(item, activeTab.slice(0, -1))}
                      className={`p-2 rounded-full transition ${
                        item.show_in_banner 
                          ? 'bg-primary-100 text-primary-600 hover:bg-primary-200' 
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {item.show_in_banner ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">
                    {item.show_in_banner ? (item.banner_order || 0) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BannerManagement;
