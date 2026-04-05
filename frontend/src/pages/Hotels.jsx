import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Hotel, Star, Search, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { hotelsAPI } from '../services/api';
import { getHotelImage } from '../utils/images';
import SEO from '../components/SEO';

const Hotels = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    city: '',
    min_price: '',
    max_price: '',
    star_rating: '',
    search: '',
  });
  const [cities, setCities] = useState([]);
  
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
  }, [pagination.current_page, pagination.per_page]);

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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setPagination((prev) => ({ ...prev, current_page: 1 }));
    const params = {};
    if (filters.city) params.city = filters.city;
    if (filters.min_price) params.min_price = filters.min_price;
    if (filters.max_price) params.max_price = filters.max_price;
    if (filters.star_rating) params.star_rating = filters.star_rating;
    if (filters.search) params.search = filters.search;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO 
        title="Hotels in Nepal" 
        description="Find the best hotels in Nepal. Browse luxury 5-star hotels, budget accommodations, and boutique stays in Kathmandu, Pokhara, and more."
        keywords="Nepal hotels, Kathmandu hotels, Pokhara hotels, luxury hotels Nepal, budget hotels Nepal, hotel booking"
        canonical="/hotels"
      />
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Hotels in Nepal</h1>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <input
              type="text"
              name="search"
              placeholder="Search hotels..."
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
              <option value="">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              name="star_rating"
              value={filters.star_rating}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Star</option>
              <option value="4">4 Star</option>
              <option value="3">3 Star</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <input
              type="number"
              name="min_price"
              placeholder="Min Price"
              value={filters.min_price}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
            <input
              type="number"
              name="max_price"
              placeholder="Max Price"
              value={filters.max_price}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            onClick={applyFilters}
            className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            <Search className="inline-block h-4 w-4 mr-2" />
            Search
          </button>
        </div>
      </div>

      {/* Results count and per page selector */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <p className="text-gray-600 mb-4 sm:mb-0">
          Showing {hotels.length} of {pagination.total} hotels
        </p>
        <div className="flex items-center space-x-2">
          <span className="text-gray-600">Rows per page:</span>
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

      {/* Hotel Grid */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {hotels.map((hotel, index) => (
              <Link
                key={hotel.id}
                to={`/hotels/${hotel.slug}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
              >
                <div className="h-48 overflow-hidden">
                  <img
                    src={hotel.featured_image || getHotelImage(index)}
                    alt={hotel.name}
                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{hotel.name}</h3>
                  <div className="flex items-center mt-1 text-gray-600 text-sm">
                    <MapPin className="h-4 w-4 mr-1" />
                    {hotel.city}
                  </div>
                  <div className="flex items-center mt-2">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-gray-700 text-sm">{hotel.rating}</span>
                    <span className="mx-1 text-gray-400">|</span>
                    <span className="text-gray-600 text-sm">{hotel.star_rating} Star</span>
                  </div>
                  <p className="mt-2 text-primary-600 font-semibold">
                    ${hotel.price_per_night}/night
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

export default Hotels;
