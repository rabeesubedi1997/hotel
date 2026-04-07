import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Hotel, Star, Search, MapPin, ChevronLeft, ChevronRight, Heart, Filter, Check, Wifi, Waves, Wind, Utensils, Car, Dumbbell, Sparkles, Tv, Coffee, Wine, Scale, X, Plus, LayoutGrid, Map } from 'lucide-react';
import { hotelsAPI, publicAPI, wishlistsAPI } from '../services/api';
import useAuthStore from '../stores/authStore';
import { getHotelImage } from '../utils/images';
import SEO from '../components/SEO';
import HotelMap from '../components/HotelMap';

const LucideIcons = { Wifi, Waves, Wind, Utensils, Car, Dumbbell, Sparkles, Tv, Coffee, Wine };

const Hotels = () => {
  const { isAuthenticated } = useAuthStore();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageContent, setPageContent] = useState(null);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [togglingId, setTogglingId] = useState(null);
  const [filters, setFilters] = useState({
    city: '',
    min_price: '',
    max_price: '',
    star_rating: '',
    search: '',
    amenities: [],
    min_rating: '',
  });
  const [cities, setCities] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // View mode: 'list' or 'map'
  const [viewMode, setViewMode] = useState('list');
  
  // Activities for map view
  const [activities, setActivities] = useState([]);
  
  // Comparison state
  const [compareIds, setCompareIds] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const maxCompare = 3;
  
  // Available amenities
  const availableAmenities = [
    { id: 'wifi', label: 'WiFi', icon: 'Wifi' },
    { id: 'pool', label: 'Swimming Pool', icon: 'Waves' },
    { id: 'ac', label: 'Air Conditioning', icon: 'Wind' },
    { id: 'restaurant', label: 'Restaurant', icon: 'Utensils' },
    { id: 'parking', label: 'Parking', icon: 'Car' },
    { id: 'gym', label: 'Gym', icon: 'Dumbbell' },
    { id: 'spa', label: 'Spa', icon: 'Sparkles' },
    { id: 'tv', label: 'TV', icon: 'Tv' },
    { id: 'breakfast', label: 'Breakfast', icon: 'Coffee' },
    { id: 'bar', label: 'Bar', icon: 'Wine' },
  ];
  
  // Pagination state
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 12,
    total: 0,
  });

  useEffect(() => {
    fetchHotels();
    fetchCities();
    fetchPageContent();
    if (isAuthenticated) {
      fetchWishlist();
    }
    // Fetch activities for map view
    if (viewMode === 'map') {
      fetchActivities();
    }
  }, [pagination.current_page, pagination.per_page, isAuthenticated, viewMode]);

  const fetchWishlist = async () => {
    try {
      const response = await wishlistsAPI.getAll();
      // Check if response.data is an array before mapping
      const wishlistData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const ids = new Set(wishlistData.map(item => item.wishlistable_id));
      setWishlistIds(ids);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      setWishlistIds(new Set()); // Set empty set on error
    }
  };

  const toggleWishlist = async (hotelId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setTogglingId(hotelId);
    try {
      if (wishlistIds.has(hotelId)) {
        // Find wishlist item id
        const response = await wishlistsAPI.getAll();
        const item = response.data.find(w => w.wishlistable_id === hotelId);
        if (item) {
          await wishlistsAPI.remove(item.id);
          setWishlistIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(hotelId);
            return newSet;
          });
        }
      } else {
        const response = await wishlistsAPI.add({
          wishlistable_type: 'hotel',
          wishlistable_id: hotelId,
        });
        setWishlistIds(prev => new Set([...prev, hotelId]));
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const fetchPageContent = async () => {
    try {
      const response = await publicAPI.getPage('hotels');
      setPageContent(response.data);
    } catch (error) {
      console.error('Error fetching page content:', error);
    }
  };

  const fetchHotels = async (params = {}) => {
    setLoading(true);
    try {
      const response = await hotelsAPI.getAll({
        ...params,
        page: pagination.current_page,
        per_page: pagination.per_page,
      });
      console.log('Hotels response:', response.data);
      setHotels(response.data.data || []);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        per_page: response.data.per_page,
        total: response.data.total,
      });
    } catch (error) {
      console.error('Error fetching hotels:', error);
      setHotels([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await hotelsAPI.getCities();
      setCities(response.data);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await publicAPI.getActivities();
      setActivities(response.data.data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      // Handle amenity checkboxes
      setFilters(prev => {
        const currentAmenities = prev.amenities || [];
        if (checked) {
          return { ...prev, amenities: [...currentAmenities, value] };
        } else {
          return { ...prev, amenities: currentAmenities.filter(a => a !== value) };
        }
      });
    } else {
      setFilters({ ...filters, [name]: value });
    }
    // Reset to page 1 when filters change
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const handleAmenityToggle = (amenityId) => {
    setFilters(prev => {
      const currentAmenities = prev.amenities || [];
      if (currentAmenities.includes(amenityId)) {
        return { ...prev, amenities: currentAmenities.filter(a => a !== amenityId) };
      } else {
        return { ...prev, amenities: [...currentAmenities, amenityId] };
      }
    });
  };

  const clearFilters = () => {
    setFilters({
      city: '',
      min_price: '',
      max_price: '',
      star_rating: '',
      search: '',
      amenities: [],
      min_rating: '',
    });
    setPagination(prev => ({ ...prev, current_page: 1 }));
    fetchHotels();
  };

  const applyFilters = () => {
    const params = {};
    if (filters.city) params.city = filters.city;
    if (filters.min_price) params.min_price = filters.min_price;
    if (filters.max_price) params.max_price = filters.max_price;
    if (filters.star_rating) params.star_rating = filters.star_rating;
    if (filters.search) params.search = filters.search;
    if (filters.amenities?.length > 0) params.amenities = filters.amenities.join(',');
    if (filters.min_rating) params.min_rating = filters.min_rating;
    
    fetchHotels(params);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.last_page) {
      setPagination((prev) => ({ ...prev, current_page: page }));
    }
  };

  const handlePerPageChange = (perPage) => {
    setPagination((prev) => ({ ...prev, per_page: perPage, current_page: 1 }));
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const { current_page, last_page } = pagination;
    
    for (let i = Math.max(1, current_page - 2); i <= Math.min(last_page, current_page + 2); i++) {
      pages.push(i);
    }
    return pages;
  };

  // Comparison functions
  const toggleCompare = (hotelId) => {
    setCompareIds(prev => {
      if (prev.includes(hotelId)) {
        return prev.filter(id => id !== hotelId);
      }
      if (prev.length >= maxCompare) {
        return prev;
      }
      return [...prev, hotelId];
    });
  };

  const clearComparison = () => {
    setCompareIds([]);
    setShowComparison(false);
  };

  const compareHotels = hotels.filter(h => compareIds.includes(h.id));

  const removeFromCompare = (hotelId) => {
    setCompareIds(prev => prev.filter(id => id !== hotelId));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO 
        title={pageContent?.title || "Hotels in Nepal"} 
        description={pageContent?.meta_description || "Find the best hotels in Nepal. Browse luxury 5-star hotels, budget accommodations, and boutique stays in Kathmandu, Pokhara, and more."}
        keywords="Nepal hotels, Kathmandu hotels, Pokhara hotels, luxury hotels Nepal, budget hotels Nepal, hotel booking"
        canonical="/hotels"
      />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary-600 to-primary-800 py-16 mb-8">
        {pageContent?.sections?.hero?.background_image && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${pageContent.sections.hero.background_image})` }}
          />
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h1 className="text-4xl font-bold mb-4">
            {pageContent?.sections?.hero?.title || 'Hotels in Nepal'}
          </h1>
          <p className="text-xl max-w-2xl mx-auto">
            {pageContent?.sections?.hero?.subtitle || 'Find your perfect stay from luxury resorts to budget-friendly accommodations'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6 sm:mb-8">
        {/* Basic Filters */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                name="search"
                placeholder={pageContent?.sections?.filters?.search_placeholder || "Search hotels..."}
                value={filters.search}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <select
                name="city"
                value={filters.city}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">{pageContent?.sections?.filters?.city_label || "All Cities"}</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <select
                name="star_rating"
                value={filters.star_rating}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">{pageContent?.sections?.filters?.rating_label || "All Ratings"}</option>
                <option value="5">{pageContent?.sections?.filters?.rating_5 || "5 Star"}</option>
                <option value="4">{pageContent?.sections?.filters?.rating_4 || "4 Star"}</option>
                <option value="3">{pageContent?.sections?.filters?.rating_3 || "3 Star"}</option>
              </select>
            </div>
            <div>
              <input
                type="number"
                name="min_price"
                placeholder={pageContent?.sections?.filters?.min_price_label || "Min Price"}
                value={filters.min_price}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <input
                type="number"
                name="max_price"
                placeholder={pageContent?.sections?.filters?.max_price_label || "Max Price"}
                value={filters.max_price}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          
          <button
            onClick={applyFilters}
            className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            <Search className="inline-block h-4 w-4 mr-2" />
            {pageContent?.sections?.filters?.search_button || "Search"}
          </button>
        </div>

        {/* Advanced Filters Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t pt-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-primary-600 font-medium hover:text-primary-700 flex items-center"
          >
            <Filter className="h-4 w-4 mr-1" />
            {showFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
            {filters.amenities?.length > 0 && (
              <span className="ml-2 bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs">
                {filters.amenities.length} selected
              </span>
            )}
          </button>
          {(filters.amenities?.length > 0 || filters.min_rating) && (
            <button
              onClick={clearFilters}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t">
            {/* Min Rating */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Rating
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  name="min_rating"
                  min="1"
                  max="5"
                  step="0.5"
                  value={filters.min_rating || 1}
                  onChange={handleFilterChange}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-700 w-12">
                  {filters.min_rating || 1}+
                </span>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Amenities
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {availableAmenities.map((amenity) => {
                  const Icon = LucideIcons[amenity.icon];
                  const isSelected = filters.amenities?.includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      onClick={() => handleAmenityToggle(amenity.id)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      <span className="text-sm">{amenity.label}</span>
                      {isSelected && <Check className="h-4 w-4 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results count and view toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <p className="text-gray-600 mb-4 sm:mb-0">
          {pageContent?.sections?.results?.showing_text?.replace('{count}', hotels.length).replace('{total}', pagination.total) || `Showing ${hotels.length} of ${pagination.total} hotels`}
        </p>
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">List</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'map'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Map className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">Map</span>
            </button>
          </div>
          
          {/* Per page selector */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">{pageContent?.sections?.results?.per_page_label || "Rows per page:"}</span>
            <select
              value={pagination.per_page}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hotel Results */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <>
              {/* Hotel Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {hotels.map((hotel, index) => (
                  <div
                    key={hotel.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition relative group"
                  >
                    <Link to={`/hotels/${hotel.slug}`}>
                      <div className="h-40 sm:h-48 overflow-hidden relative">
                        <img
                          src={hotel.featured_image || getHotelImage(index)}
                          alt={hotel.name}
                          className="w-full h-full object-cover hover:scale-105 transition duration-500"
                        />
                        {/* Compare Checkbox */}
                        <label 
                          className="absolute top-2 sm:top-3 left-2 sm:left-3 flex items-center space-x-1 bg-white/90 px-2 py-1 rounded-full shadow-md cursor-pointer z-10 hover:bg-white transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={compareIds.includes(hotel.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleCompare(hotel.id);
                            }}
                            disabled={compareIds.length >= maxCompare && !compareIds.includes(hotel.id)}
                            className="w-3 h-3 sm:w-4 sm:h-4 text-primary-600 rounded focus:ring-primary-500"
                          />
                          <span className="text-xs font-medium text-gray-700 hidden sm:inline">Compare</span>
                        </label>
                        {/* Heart Icon */}
                        <button
                          onClick={(e) => toggleWishlist(hotel.id, e)}
                          disabled={togglingId === hotel.id}
                          className={`absolute top-2 sm:top-3 right-2 sm:right-3 p-1.5 sm:p-2 rounded-full shadow-md transition-all z-10 ${
                            wishlistIds.has(hotel.id) 
                              ? 'bg-red-50 text-red-500' 
                              : 'bg-white/90 text-gray-400 hover:text-red-500 hover:bg-white'
                          }`}
                        >
                          <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${wishlistIds.has(hotel.id) ? 'fill-current' : ''}`} />
                        </button>
                        {/* Featured Badge */}
                        {hotel.is_featured && (
                          <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                            Featured
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center text-gray-500 text-xs sm:text-sm mb-1 sm:mb-2">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        {hotel.city}
                      </div>
                      <h3 className="text-sm sm:text-lg font-bold text-gray-900 group-hover:text-primary-600 transition mb-2 sm:mb-3 line-clamp-2">
                        {hotel.name}
                      </h3>
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="flex items-center">
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 fill-current mr-1" />
                          <span className="text-xs sm:text-sm font-semibold">{hotel.rating || '4.5'}</span>
                        </div>
                        <span className="text-xs sm:text-sm text-gray-500">{hotel.star_rating} Star</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-lg sm:text-2xl font-bold text-primary-600">${hotel.price_per_night}</span>
                          <span className="text-xs sm:text-sm text-gray-500">/night</span>
                        </div>
                        <Link
                          to={`/hotels/${hotel.slug}`}
                          className="bg-primary-600 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium hover:bg-primary-700 transition"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.last_page > 1 && (
                <div className="flex justify-center items-center mt-8 space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                    className="px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {getPageNumbers().map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 rounded-md ${
                        page === pagination.current_page
                          ? 'bg-primary-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
                    className="px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Map View */
            <HotelMap hotels={hotels} activities={activities} />
          )}
        </>
      )}

      {/* Comparison Bar */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="font-medium text-gray-700">
                {compareIds.length} of {maxCompare} selected for comparison
              </span>
              <div className="flex space-x-2">
                {compareHotels.map(hotel => (
                  <div key={hotel.id} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                    <span className="text-sm truncate max-w-[120px]">{hotel.name}</span>
                    <button
                      onClick={() => removeFromCompare(hotel.id)}
                      className="ml-2 text-gray-500 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={clearComparison}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowComparison(true)}
                disabled={compareIds.length < 2}
                className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Scale className="h-4 w-4 mr-2" />
                Compare Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {showComparison && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Compare Hotels</h2>
              <button
                onClick={() => setShowComparison(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className={`grid gap-6 ${compareHotels.length === 2 ? 'grid-cols-2' : compareHotels.length === 3 ? 'grid-cols-3' : 'grid-cols-1'}`}>
                {compareHotels.map((hotel, index) => (
                  <div key={hotel.id} className="space-y-4">
                    {/* Hotel Image */}
                    <img
                      src={hotel.featured_image || getHotelImage(index)}
                      alt={hotel.name}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    
                    {/* Hotel Name */}
                    <h3 className="text-lg font-bold text-gray-900">{hotel.name}</h3>
                    
                    {/* Rating */}
                    <div className="flex items-center space-x-1">
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                      <span className="font-semibold text-lg">{hotel.rating}</span>
                      <span className="text-gray-500">({hotel.reviews_count || 0} reviews)</span>
                    </div>
                    
                    {/* Price */}
                    <div className="bg-primary-50 p-3 rounded-lg">
                      <span className="text-2xl font-bold text-primary-700">${hotel.price_per_night}</span>
                      <span className="text-gray-600">/night</span>
                    </div>
                    
                    {/* Location */}
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      {hotel.city}, {hotel.address}
                    </div>
                    
                    {/* Star Rating */}
                    <div>
                      <span className="text-sm text-gray-500">Star Rating</span>
                      <div className="flex items-center mt-1">
                        {[...Array(hotel.star_rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                    </div>
                    
                    {/* Amenities */}
                    <div>
                      <span className="text-sm text-gray-500">Amenities</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {hotel.amenities?.slice(0, 5).map((amenity, i) => (
                          <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                            {amenity}
                          </span>
                        ))}
                        {hotel.amenities?.length > 5 && (
                          <span className="text-gray-500 text-xs">+{hotel.amenities.length - 5} more</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Description */}
                    <div>
                      <span className="text-sm text-gray-500">Description</span>
                      <p className="text-sm text-gray-700 mt-1 line-clamp-3">{hotel.description}</p>
                    </div>
                    
                    {/* CTA */}
                    <Link
                      to={`/hotels/${hotel.slug}`}
                      className="block w-full bg-primary-600 text-white text-center py-2 rounded-md hover:bg-primary-700"
                    >
                      View Details
                    </Link>
                  </div>
                ))}
              </div>
              
              {compareHotels.length < 2 && (
                <div className="text-center py-8 text-gray-500">
                  Please select at least 2 hotels to compare
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hotels;
