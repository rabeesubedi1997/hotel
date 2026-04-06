import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Search, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { activitiesAPI, publicAPI } from '../services/api';
import { getActivityImage } from '../utils/images';
import SEO from '../components/SEO';

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageContent, setPageContent] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    city: '',
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
    fetchActivities();
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

  const applyFilters = () => {
    setPagination((prev) => ({ ...prev, current_page: 1 }));
    const params = {};
    if (filters.type) params.type = filters.type;
    if (filters.city) params.city = filters.city;
    if (filters.difficulty_level) params.difficulty_level = filters.difficulty_level;
    if (filters.min_price) params.min_price = filters.min_price;
    if (filters.max_price) params.max_price = filters.max_price;
    if (filters.search) params.search = filters.search;
    fetchActivities(params);
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

  const getDifficultyColor = (level) => {
    switch (level) {
      case 'easy': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'challenging': return 'text-orange-600';
      case 'extreme': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO 
        title={pageContent?.title || "Adventure Activities in Nepal"}
        description={pageContent?.meta_description || "Discover exciting adventure activities in Nepal. Trekking, paragliding, bungee jumping, rafting and more thrilling experiences."}
        keywords="Nepal activities, trekking Nepal, paragliding, bungee jumping, rafting, adventure sports Nepal, things to do Nepal"
        canonical="/activities"
      />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-green-600 to-blue-600 py-16 mb-8">
        {pageContent?.sections?.hero?.background_image && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${pageContent.sections.hero.background_image})` }}
          />
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h1 className="text-4xl font-bold mb-4">
            {pageContent?.sections?.hero?.title || 'Adventure Activities'}
          </h1>
          <p className="text-xl max-w-2xl mx-auto">
            {pageContent?.sections?.hero?.subtitle || 'Discover exciting adventure activities in Nepal'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <input
              type="text"
              name="search"
              placeholder={pageContent?.sections?.filters?.search_placeholder || "Search activities..."}
              value={filters.search}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">{pageContent?.sections?.filters?.type_label || "All Types"}</option>
              {Object.entries(types).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
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
          <div>
            <select
              name="difficulty_level"
              value={filters.difficulty_level}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">{pageContent?.sections?.filters?.difficulty_label || "All Levels"}</option>
              <option value="easy">{pageContent?.sections?.filters?.difficulty_easy || "Easy"}</option>
              <option value="moderate">{pageContent?.sections?.filters?.difficulty_moderate || "Moderate"}</option>
              <option value="challenging">{pageContent?.sections?.filters?.difficulty_challenging || "Challenging"}</option>
              <option value="extreme">{pageContent?.sections?.filters?.difficulty_extreme || "Extreme"}</option>
            </select>
          </div>
          <button
            onClick={applyFilters}
            className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            <Search className="inline-block h-4 w-4 mr-2" />
            {pageContent?.sections?.filters?.search_button || "Search"}
          </button>
        </div>
      </div>

      {/* Results count and per page selector */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <p className="text-gray-600 mb-4 sm:mb-0">
          {pageContent?.sections?.results?.showing_text?.replace('{count}', activities.length).replace('{total}', pagination.total) || `Showing ${activities.length} of ${pagination.total} activities`}
        </p>
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

      {/* Activities Grid */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activities.map((activity) => (
              <Link
                key={activity.id}
                to={`/activities/${activity.slug}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
              >
                <div className="h-48 overflow-hidden">
                  <img
                    src={activity.featured_image || getActivityImage(activity.type)}
                    alt={activity.name}
                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-primary-600 uppercase">
                      {activity.type}
                    </span>
                    <span className={`text-xs font-semibold ${getDifficultyColor(activity.difficulty_level)}`}>
                      {activity.difficulty_level}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{activity.name}</h3>
                  <div className="flex items-center mt-1 text-gray-600 text-sm">
                    <MapPin className="h-4 w-4 mr-1" />
                    {activity.location}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-primary-600 font-semibold">${activity.price}{pageContent?.sections?.activity_card?.per_person || ""}</p>
                    <span className="text-sm text-gray-500">{activity.duration}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {pageContent?.sections?.activity_card?.max_participants?.replace('{count}', activity.max_participants) || `Max ${activity.max_participants} participants`}
                  </p>
                </div>
              </Link>
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
      )}
    </div>
  );
};

export default Activities;
