import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Star, Building2, Mountain } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

// Create custom icons using Lucide icons
const createHotelIcon = () => {
  const iconHtml = renderToStaticMarkup(
    <div style={{
      backgroundColor: '#0d9488',
      borderRadius: '50%',
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '3px solid white',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    }}>
      <Building2 size={20} color="white" />
    </div>
  );
  
  return L.divIcon({
    html: iconHtml,
    className: 'custom-hotel-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

const createActivityIcon = () => {
  const iconHtml = renderToStaticMarkup(
    <div style={{
      backgroundColor: '#f59e0b',
      borderRadius: '50%',
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '3px solid white',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    }}>
      <Mountain size={20} color="white" />
    </div>
  );
  
  return L.divIcon({
    html: iconHtml,
    className: 'custom-activity-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

const HotelMap = ({ hotels = [], activities = [], onItemClick }) => {
  const navigate = useNavigate();
  
  // Calculate center from all items with coordinates
  const center = useMemo(() => {
    const allItems = [
      ...hotels.filter(h => h.latitude && h.longitude),
      ...activities.filter(a => a.latitude && a.longitude)
    ];
    
    if (allItems.length === 0) {
      return [27.7172, 85.3240]; // Default to Kathmandu
    }
    
    const avgLat = allItems.reduce((sum, item) => sum + parseFloat(item.latitude), 0) / allItems.length;
    const avgLng = allItems.reduce((sum, item) => sum + parseFloat(item.longitude), 0) / allItems.length;
    return [avgLat, avgLng];
  }, [hotels, activities]);

  const hotelIcon = useMemo(() => createHotelIcon(), []);
  const activityIcon = useMemo(() => createActivityIcon(), []);

  const handleMarkerClick = (item, type) => {
    if (onItemClick) {
      onItemClick(item, type);
    } else {
      const path = type === 'hotel' ? `/hotels/${item.slug}` : `/activities/${item.slug}`;
      navigate(path);
    }
  };

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg relative">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Hotel Markers */}
        {hotels.map((hotel) => (
          hotel.latitude && hotel.longitude && (
            <Marker
              key={`hotel-${hotel.id}`}
              position={[parseFloat(hotel.latitude), parseFloat(hotel.longitude)]}
              icon={hotelIcon}
              eventHandlers={{
                click: () => handleMarkerClick(hotel, 'hotel'),
              }}
            >
              <Popup>
                <div 
                  className="p-3 min-w-[220px] cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => handleMarkerClick(hotel, 'hotel')}
                >
                  <div className="relative mb-3">
                    <img
                      src={hotel.featured_image || `https://source.unsplash.com/400x300/?hotel,room&sig=${hotel.id}`}
                      alt={hotel.name}
                      className="w-full h-36 object-cover rounded-lg"
                    />
                    <div className="absolute top-2 left-2 bg-primary-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
                      <Building2 size={12} className="mr-1" />
                      Hotel
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 text-lg">{hotel.name}</h3>
                  <div className="flex items-center mb-2">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm font-medium">{hotel.rating}</span>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="text-sm text-gray-600">{hotel.city}</span>
                  </div>
                  <p className="text-primary-600 font-bold text-lg">${hotel.price_per_night}<span className="text-sm font-normal text-gray-500">/night</span></p>
                  <button className="mt-3 w-full bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        ))}
        
        {/* Activity Markers */}
        {activities.map((activity) => (
          activity.latitude && activity.longitude && (
            <Marker
              key={`activity-${activity.id}`}
              position={[parseFloat(activity.latitude), parseFloat(activity.longitude)]}
              icon={activityIcon}
              eventHandlers={{
                click: () => handleMarkerClick(activity, 'activity'),
              }}
            >
              <Popup>
                <div 
                  className="p-3 min-w-[220px] cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => handleMarkerClick(activity, 'activity')}
                >
                  <div className="relative mb-3">
                    <img
                      src={activity.featured_image || `https://source.unsplash.com/400x300/?adventure,${activity.type}&sig=${activity.id}`}
                      alt={activity.name}
                      className="w-full h-36 object-cover rounded-lg"
                    />
                    <div className="absolute top-2 left-2 bg-amber-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
                      <Mountain size={12} className="mr-1" />
                      {activity.type?.replace('_', ' ') || 'Activity'}
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 text-lg">{activity.name}</h3>
                  <div className="flex items-center mb-2">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm font-medium">{activity.rating || '4.5'}</span>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="text-sm text-gray-600">{activity.city}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-amber-600 font-bold text-lg">${activity.price}</p>
                    <span className="text-xs text-gray-500">{activity.duration}</span>
                  </div>
                  <button className="mt-3 w-full bg-amber-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition">
                    View Activity
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 z-[1000]">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-primary-600 flex items-center justify-center mr-2">
              <Building2 size={10} color="white" />
            </div>
            <span className="text-gray-700">Hotels</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center mr-2">
              <Mountain size={10} color="white" />
            </div>
            <span className="text-gray-700">Activities</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelMap;
