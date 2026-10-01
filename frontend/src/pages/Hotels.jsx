import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Star, Search, MapPin, ChevronLeft, ChevronRight, SlidersHorizontal, Check, Wifi, Waves, Wind, Utensils, Car, Dumbbell, Sparkles, Tv, Coffee, Wine, Scale, X, LayoutGrid, Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import { hotelsAPI, publicAPI, wishlistsAPI } from '../services/api';
import useAuthStore from '../stores/authStore';
import { getHotelImage } from '../utils/images';
import SEO from '../components/SEO';
import HotelMap from '../components/HotelMap';
import HotelCard from '../components/HotelCard';
import DestinationShortcuts from '../components/DestinationShortcuts';
import { Button, Input, Select, Badge, RatingStars, Container, CardGridSkeleton } from '../components/ui';
import PromotionSlot from '../components/PromotionSlot';

const LucideIcons = { Wifi, Waves, Wind, Utensils, Car, Dumbbell, Sparkles, Tv, Coffee, Wine };

const Hotels = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageContent, setPageContent] = useState(null);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [togglingId, setTogglingId] = useState(null);
  // Pre-filled from the hero SearchWidget / a DestinationCard link, e.g.
  // /hotels?city=Pokhara — read once on mount, then normal filter state.
  const [filters, setFilters] = useState({
    city: searchParams.get('city') || '',
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

  // Available amenities (dynamic from backend)
  const [availableAmenities, setAvailableAmenities] = useState([]);
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 1000 });

  // Icon mapper helper
  const getAmenityIcon = (name) => {
    const lowercaseName = name.toLowerCase();
    if (lowercaseName.includes('wifi')) return 'Wifi';
    if (lowercaseName.includes('pool')) return 'Waves';
    if (lowercaseName.includes('ac') || lowercaseName.includes('air')) return 'Wind';
    if (lowercaseName.includes('restaurant')) return 'Utensils';
    if (lowercaseName.includes('park')) return 'Car';
    if (lowercaseName.includes('gym') || lowercaseName.includes('fitness')) return 'Dumbbell';
    if (lowercaseName.includes('spa')) return 'Sparkles';
    if (lowercaseName.includes('tv')) return 'Tv';
    if (lowercaseName.includes('bar')) return 'Wine';
    if (lowercaseName.includes('breakfast')) return 'Coffee';
    return 'Check'; // default
  };

  // Pagination state
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 12,
    total: 0,
  });

  useEffect(() => {
    fetchHotels(filters.city ? { city: filters.city } : {});
    fetchCities();
    fetchPageContent();
    fetchDynamicFilters();
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

  const fetchDynamicFilters = async () => {
    try {
      const response = await hotelsAPI.getFilters();
      setPriceBounds({ min: response.data.min_price, max: response.data.max_price });
      // Map string amenities to object
      const formattedAmenities = response.data.amenities.map(a => ({
        id: a,
        label: a,
        icon: getAmenityIcon(a)
      }));
      setAvailableAmenities(formattedAmenities);
    } catch (error) {
      console.error('Error fetching dynamic filters:', error);
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

  // Debounced live search — typing in the search box re-runs the filter
  // set automatically, same as clicking "Search" would, without the user
  // needing to click anything. Enter still works immediately (see the
  // input's onKeyDown below) instead of waiting out the debounce.
  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

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

  const activeAdvancedCount = (filters.amenities?.length || 0) + (filters.min_rating ? 1 : 0);

  return (
    <div className="min-h-screen bg-neutral-50 pb-8">
      <SEO
        title={pageContent?.title || "Hotels in Nepal"}
        description={pageContent?.meta_description || "Find the best hotels in Nepal. Browse luxury 5-star hotels, budget accommodations, and boutique stays in Kathmandu, Pokhara, and more."}
        keywords="Nepal hotels, Kathmandu hotels, Pokhara hotels, luxury hotels Nepal, budget hotels Nepal, hotel booking"
        canonical="/hotels"
      />

      {/* Hero Section */}
      <div className="relative bg-neutral-900 py-14 sm:py-20 overflow-hidden">
        {pageContent?.sections?.hero?.background_image && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity"
            style={{ backgroundImage: `url(${pageContent.sections.hero.background_image})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent" />
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-primary-500/25 blur-3xl pointer-events-none" />
        <Container className="relative text-center text-white">
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            {pageContent?.sections?.hero?.title || 'Hotels in Nepal'}
          </h1>
          <p className="text-lg sm:text-xl max-w-2xl mx-auto text-neutral-200">
            {pageContent?.sections?.hero?.subtitle || 'Find your perfect stay from luxury resorts to budget-friendly accommodations'}
          </p>
          {(pagination.total > 0 || cities.length > 0) && (
            <div className="flex items-center justify-center gap-6 sm:gap-10 mt-8">
              {pagination.total > 0 && (
                <div>
                  <span className="font-display text-2xl sm:text-3xl font-bold text-primary-300 block">{pagination.total}+</span>
                  <span className="text-xs sm:text-sm text-neutral-300 uppercase tracking-wide">Hotels Listed</span>
                </div>
              )}
              {cities.length > 0 && (
                <div>
                  <span className="font-display text-2xl sm:text-3xl font-bold text-primary-300 block">{cities.length}</span>
                  <span className="text-xs sm:text-sm text-neutral-300 uppercase tracking-wide">Cities Covered</span>
                </div>
              )}
            </div>
          )}
        </Container>
      </div>

      <Container className="pt-6">
        {/* Filter Bar */}
        <div className="bg-white rounded-3xl shadow-card p-4 sm:p-5 mb-6 sm:mb-8 -mt-10 sm:-mt-14 relative z-10">
          <div className="flex flex-wrap gap-3">
            <Input
              icon={Search}
              name="search"
              placeholder={pageContent?.sections?.filters?.search_placeholder || "Search hotels..."}
              value={filters.search}
              onChange={handleFilterChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyFilters();
                }
              }}
              className="flex-1 min-w-[220px]"
            />
            <Select
              name="city"
              value={filters.city}
              onChange={handleFilterChange}
              className="w-full sm:w-44"
            >
              <option value="">{pageContent?.sections?.filters?.city_label || "All Cities"}</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </Select>
            <Select
              name="star_rating"
              value={filters.star_rating}
              onChange={handleFilterChange}
              className="w-full sm:w-40"
            >
              <option value="">{pageContent?.sections?.filters?.rating_label || "All Ratings"}</option>
              <option value="5">{pageContent?.sections?.filters?.rating_5 || "5 Star"}</option>
              <option value="4">{pageContent?.sections?.filters?.rating_4 || "4 Star"}</option>
              <option value="3">{pageContent?.sections?.filters?.rating_3 || "3 Star"}</option>
            </Select>
            <Input
              type="number"
              name="min_price"
              placeholder={pageContent?.sections?.filters?.min_price_label || "Min Price"}
              value={filters.min_price}
              onChange={handleFilterChange}
              className="w-full sm:w-32"
            />
            <Input
              type="number"
              name="max_price"
              placeholder={pageContent?.sections?.filters?.max_price_label || "Max Price"}
              value={filters.max_price}
              onChange={handleFilterChange}
              className="w-full sm:w-32"
            />
          </div>

          <div className="flex gap-3 mt-3">
            <Button
              variant="secondary"
              onClick={() => setShowFilters(true)}
              className="relative flex-1 sm:flex-none"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
              {activeAdvancedCount > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-accent-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeAdvancedCount}
                </span>
              )}
            </Button>
            <Button variant="primary" onClick={applyFilters} className="flex-1 sm:flex-none">
              <Search className="h-4 w-4" />
              <span>{pageContent?.sections?.filters?.search_button || "Search"}</span>
            </Button>
          </div>
        </div>

        {/* Advanced Filters Drawer */}
        {showFilters && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-[70]"
              onClick={() => setShowFilters(false)}
            />
            <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white z-[80] shadow-2xl flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                <h3 className="font-display text-lg font-bold text-neutral-900">Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-neutral-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Min Rating */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-3">
                    Minimum Guest Rating
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      name="min_rating"
                      min="1"
                      max="5"
                      step="0.5"
                      value={filters.min_rating || 1}
                      onChange={handleFilterChange}
                      className="flex-1 accent-primary-600"
                    />
                    <span className="text-sm font-semibold text-neutral-700 w-10 text-right">
                      {filters.min_rating || 1}+
                    </span>
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-3">
                    Amenities
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableAmenities.map((amenity) => {
                      const Icon = LucideIcons[amenity.icon];
                      const isSelected = filters.amenities?.includes(amenity.id);
                      return (
                        <button
                          key={amenity.id}
                          onClick={() => handleAmenityToggle(amenity.id)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-700'
                          }`}
                        >
                          {Icon && <Icon className="h-4 w-4 shrink-0" />}
                          <span className="truncate">{amenity.label}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 ml-auto shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-neutral-200 flex gap-3">
                <Button variant="ghost" onClick={clearFilters} className="flex-1">
                  Clear all
                </Button>
                <Button
                  variant="primary"
                  onClick={() => { applyFilters(); setShowFilters(false); }}
                  className="flex-1"
                >
                  Show results
                </Button>
              </div>
            </div>
          </>
        )}

        <PromotionSlot placement="listing_sidebar" className="mb-6" />

        <DestinationShortcuts type="hotels" className="mb-8" />

        {/* Results count and view toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <p className="text-neutral-600 text-sm sm:text-base">
            {pageContent?.sections?.results?.showing_text?.replace('{count}', hotels.length).replace('{total}', pagination.total) || `Showing ${hotels.length} of ${pagination.total} hotels`}
          </p>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="inline-flex bg-neutral-100 rounded-xl p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={`!shadow-none ${viewMode === 'list' ? '!bg-white !text-primary-600 shadow-sm' : '!text-neutral-600'}`}
              >
                <LayoutGrid className="h-4 w-4" />
                <span>List</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('map')}
                className={`!shadow-none ${viewMode === 'map' ? '!bg-white !text-primary-600 shadow-sm' : '!text-neutral-600'}`}
              >
                <Map className="h-4 w-4" />
                <span>Map</span>
              </Button>
            </div>

            {/* Per page selector */}
            <Select
              value={pagination.per_page}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="w-28 sm:w-32"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </Select>
          </div>
        </div>

        {/* Hotel Results */}
        {loading ? (
          <CardGridSkeleton count={12} />
        ) : (
          <>
            {viewMode === 'list' ? (
              <>
                {/* Hotel Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                  {hotels.map((hotel, index) => (
                    <HotelCard
                      key={hotel.id}
                      hotel={hotel}
                      index={index}
                      isWishlisted={wishlistIds.has(hotel.id)}
                      onToggleWishlist={toggleWishlist}
                      wishlistBusy={togglingId === hotel.id}
                      isComparing={compareIds.includes(hotel.id)}
                      onToggleCompare={toggleCompare}
                      maxCompareReached={compareIds.length >= maxCompare}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.last_page > 1 && (
                  <div className="flex justify-center items-center mt-10 gap-2 flex-wrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePageChange(pagination.current_page - 1)}
                      disabled={pagination.current_page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {getPageNumbers().map((page) => (
                      <Button
                        key={page}
                        variant={page === pagination.current_page ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="!px-4"
                      >
                        {page}
                      </Button>
                    ))}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePageChange(pagination.current_page + 1)}
                      disabled={pagination.current_page === pagination.last_page}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              /* Map View */
              <HotelMap hotels={hotels} activities={activities} />
            )}
          </>
        )}
      </Container>

      {/* Comparison Bar */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 shadow-2xl p-4 z-40">
          <Container className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-semibold text-neutral-700 text-sm">
                {compareIds.length} of {maxCompare} selected for comparison
              </span>
              <div className="flex flex-wrap gap-2">
                {compareHotels.map(hotel => (
                  <div key={hotel.id} className="flex items-center bg-neutral-100 rounded-full px-3 py-1">
                    <span className="text-sm truncate max-w-[120px] text-neutral-700">{hotel.name}</span>
                    <button
                      onClick={() => removeFromCompare(hotel.id)}
                      className="ml-2 text-neutral-500 hover:text-accent-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={clearComparison}
                className="text-neutral-500 hover:text-neutral-700 text-sm font-medium"
              >
                Clear All
              </button>
              <Button
                variant="primary"
                onClick={() => setShowComparison(true)}
                disabled={compareIds.length < 2}
              >
                <Scale className="h-4 w-4" />
                Compare Now
              </Button>
            </div>
          </Container>
        </div>
      )}

      {/* Comparison Modal */}
      {showComparison && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-neutral-200 p-4 flex items-center justify-between rounded-t-3xl">
              <h2 className="font-display text-xl font-bold text-neutral-900">Compare Hotels</h2>
              <button
                onClick={() => setShowComparison(false)}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className={`grid gap-6 ${compareHotels.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : compareHotels.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
                {compareHotels.map((hotel, index) => (
                  <div key={hotel.id} className="space-y-4">
                    {/* Hotel Image */}
                    <img
                      src={hotel.featured_image || getHotelImage(index)}
                      alt={hotel.name}
                      className="w-full aspect-[4/3] object-cover rounded-2xl"
                    />

                    {/* Hotel Name */}
                    <h3 className="font-display text-lg font-bold text-neutral-900">{hotel.name}</h3>

                    {/* Rating */}
                    <RatingStars rating={hotel.rating || 0} reviewCount={hotel.reviews_count || 0} size="md" />

                    {/* Price */}
                    <div className="bg-primary-50 p-3 rounded-xl">
                      <span className="text-2xl font-bold text-primary-700">${hotel.price_per_night}</span>
                      <span className="text-neutral-600">/night</span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center text-neutral-600 text-sm">
                      <MapPin className="h-4 w-4 mr-1 shrink-0" />
                      {hotel.city}, {hotel.address}
                    </div>

                    {/* Star Rating */}
                    <div>
                      <span className="text-sm text-neutral-500">Star Rating</span>
                      <div className="flex items-center mt-1">
                        {[...Array(hotel.star_rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 text-amber-400 fill-current" />
                        ))}
                      </div>
                    </div>

                    {/* Amenities */}
                    <div>
                      <span className="text-sm text-neutral-500">Amenities</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {hotel.amenities?.slice(0, 5).map((amenity, i) => (
                          <Badge key={i} tone="neutral">{amenity}</Badge>
                        ))}
                        {hotel.amenities?.length > 5 && (
                          <span className="text-neutral-500 text-xs self-center">+{hotel.amenities.length - 5} more</span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <span className="text-sm text-neutral-500">Description</span>
                      <p className="text-sm text-neutral-700 mt-1 line-clamp-3">{hotel.description}</p>
                    </div>

                    {/* CTA */}
                    <Button as={Link} to={`/hotels/${hotel.slug}`} variant="primary" fullWidth>
                      View Details
                    </Button>
                  </div>
                ))}
              </div>

              {compareHotels.length < 2 && (
                <div className="text-center py-8 text-neutral-500">
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
