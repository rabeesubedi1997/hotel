import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { activitiesAPI, publicAPI } from '../services/api';
import SEO from '../components/SEO';
import ActivityCard from '../components/ActivityCard';
import DestinationShortcuts from '../components/DestinationShortcuts';
import { Button, Input, Select, Container, CardGridSkeleton } from '../components/ui';
import PromotionSlot from '../components/PromotionSlot';

const Activities = () => {
  const [searchParams] = useSearchParams();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageContent, setPageContent] = useState(null);
  // Pre-filled from the hero SearchWidget / a DestinationCard link, e.g.
  // /activities?city=Pokhara — read once on mount, then normal filter state.
  const [filters, setFilters] = useState({
    type: '',
    city: searchParams.get('city') || '',
    difficulty_level: '',
    min_price: '',
    max_price: '',
    search: '',
  });
  const [types, setTypes] = useState([]);
  const [cities, setCities] = useState([]);

  // Pagination state
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 12,
    total: 0,
  });

  useEffect(() => {
    fetchActivities(filters.city ? { city: filters.city } : {});
    fetchTypes();
    fetchCities();
    fetchPageContent();
  }, [pagination.current_page, pagination.per_page]);

  const fetchPageContent = async () => {
    try {
      const response = await publicAPI.getPage('activities');
      setPageContent(response.data);
    } catch (error) {
      console.error('Error fetching page content:', error);
    }
  };

  const fetchActivities = async (params = {}) => {
    setLoading(true);
    try {
      const response = await activitiesAPI.getAll({
        ...params,
        page: pagination.current_page,
        per_page: pagination.per_page,
      });
      setActivities(response.data.data || []);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        per_page: response.data.per_page,
        total: response.data.total,
      });
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTypes = async () => {
    try {
      const response = await activitiesAPI.getTypes();
      setTypes(response.data);
    } catch (error) {
      console.error('Error fetching types:', error);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await activitiesAPI.getCities();
      setCities(response.data);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const buildParams = (activeFilters) => {
    const params = {};
    if (activeFilters.type) params.type = activeFilters.type;
    if (activeFilters.city) params.city = activeFilters.city;
    if (activeFilters.difficulty_level) params.difficulty_level = activeFilters.difficulty_level;
    if (activeFilters.min_price) params.min_price = activeFilters.min_price;
    if (activeFilters.max_price) params.max_price = activeFilters.max_price;
    if (activeFilters.search) params.search = activeFilters.search;
    return params;
  };

  const applyFilters = () => {
    setPagination((prev) => ({ ...prev, current_page: 1 }));
    fetchActivities(buildParams(filters));
  };

  // Debounced live search — typing in the search box re-runs the filter
  // set automatically, same as clicking "Search" would. Enter still works
  // immediately (see the input's onKeyDown below) instead of waiting out
  // the debounce.
  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  // Category pill bar — instant filter using the real `type` enum served by
  // the backend, rather than requiring the dropdown to be opened.
  const handleCategoryClick = (typeKey) => {
    const nextFilters = { ...filters, type: typeKey };
    setFilters(nextFilters);
    setPagination((prev) => ({ ...prev, current_page: 1 }));
    fetchActivities(buildParams(nextFilters));
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

  return (
    <div className="min-h-screen bg-neutral-50 pb-8">
      <SEO
        title={pageContent?.title || "Adventure Activities in Nepal"}
        description={pageContent?.meta_description || "Discover exciting adventure activities in Nepal. Trekking, paragliding, bungee jumping, rafting and more thrilling experiences."}
        keywords="Nepal activities, trekking Nepal, paragliding, bungee jumping, rafting, adventure sports Nepal, things to do Nepal"
        canonical="/activities"
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
            {pageContent?.sections?.hero?.title || 'Adventure Activities'}
          </h1>
          <p className="text-lg sm:text-xl max-w-2xl mx-auto text-neutral-200">
            {pageContent?.sections?.hero?.subtitle || 'Discover exciting adventure activities in Nepal'}
          </p>
          {(pagination.total > 0 || cities.length > 0) && (
            <div className="flex items-center justify-center gap-6 sm:gap-10 mt-8">
              {pagination.total > 0 && (
                <div>
                  <span className="font-display text-2xl sm:text-3xl font-bold text-primary-300 block">{pagination.total}+</span>
                  <span className="text-xs sm:text-sm text-neutral-300 uppercase tracking-wide">Adventures</span>
                </div>
              )}
              {Object.keys(types).length > 0 && (
                <div>
                  <span className="font-display text-2xl sm:text-3xl font-bold text-primary-300 block">{Object.keys(types).length}</span>
                  <span className="text-xs sm:text-sm text-neutral-300 uppercase tracking-wide">Categories</span>
                </div>
              )}
              {cities.length > 0 && (
                <div>
                  <span className="font-display text-2xl sm:text-3xl font-bold text-primary-300 block">{cities.length}</span>
                  <span className="text-xs sm:text-sm text-neutral-300 uppercase tracking-wide">Regions</span>
                </div>
              )}
            </div>
          )}
        </Container>
      </div>

      <Container className="pt-6">
        {/* Category pill bar — instant filter by activity type */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
          <button
            type="button"
            onClick={() => handleCategoryClick('')}
            className={`px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-all ${
              !filters.type ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            All Adventures
          </button>
          {Object.entries(types).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleCategoryClick(key)}
              className={`px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-all ${
                filters.type === key ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-3xl shadow-card p-4 sm:p-5 mb-6 sm:mb-8 relative z-10">
          <div className="flex flex-wrap gap-3">
            <Input
              icon={Search}
              name="search"
              placeholder={pageContent?.sections?.filters?.search_placeholder || "Search activities..."}
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
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="w-full sm:w-44"
            >
              <option value="">{pageContent?.sections?.filters?.type_label || "All Types"}</option>
              {Object.entries(types).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
            <Select
              name="city"
              value={filters.city}
              onChange={handleFilterChange}
              className="w-full sm:w-40"
            >
              <option value="">{pageContent?.sections?.filters?.city_label || "All Cities"}</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </Select>
            <Select
              name="difficulty_level"
              value={filters.difficulty_level}
              onChange={handleFilterChange}
              className="w-full sm:w-40"
            >
              <option value="">{pageContent?.sections?.filters?.difficulty_label || "All Levels"}</option>
              <option value="easy">{pageContent?.sections?.filters?.difficulty_easy || "Easy"}</option>
              <option value="moderate">{pageContent?.sections?.filters?.difficulty_moderate || "Moderate"}</option>
              <option value="challenging">{pageContent?.sections?.filters?.difficulty_challenging || "Challenging"}</option>
              <option value="extreme">{pageContent?.sections?.filters?.difficulty_extreme || "Extreme"}</option>
            </Select>
            <Input
              type="number"
              name="min_price"
              placeholder="Min Price"
              value={filters.min_price}
              onChange={handleFilterChange}
              className="w-full sm:w-32"
            />
            <Input
              type="number"
              name="max_price"
              placeholder="Max Price"
              value={filters.max_price}
              onChange={handleFilterChange}
              className="w-full sm:w-32"
            />
          </div>

          <div className="mt-3">
            <Button variant="primary" onClick={applyFilters} className="w-full sm:w-auto">
              <Search className="h-4 w-4" />
              <span>{pageContent?.sections?.filters?.search_button || "Search"}</span>
            </Button>
          </div>
        </div>

        <PromotionSlot placement="listing_sidebar" className="mb-6" />

        <DestinationShortcuts type="activities" className="mb-8" />

        {/* Results count and per page selector */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <p className="text-neutral-600 text-sm sm:text-base">
            {pageContent?.sections?.results?.showing_text?.replace('{count}', activities.length).replace('{total}', pagination.total) || `Showing ${activities.length} of ${pagination.total} activities`}
          </p>
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

        {/* Activities Grid */}
        {loading ? (
          <CardGridSkeleton count={12} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
              {activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  perPersonLabel={pageContent?.sections?.activity_card?.per_person || ''}
                  maxParticipantsLabel={pageContent?.sections?.activity_card?.max_participants?.replace('{count}', activity.max_participants)}
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
        )}
      </Container>
    </div>
  );
};

export default Activities;
