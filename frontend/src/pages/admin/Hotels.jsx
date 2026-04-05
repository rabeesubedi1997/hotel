import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Star, Loader2, X, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { getHotelImage } from '../../utils/images';
import ImageSelector from '../../components/ImageSelector';

const AdminHotels = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [imageSelectorOpen, setImageSelectorOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    city: '',
    price_per_night: '',
    star_rating: '',
    status: 'active',
    featured_image: '',
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });

  useEffect(() => {
    fetchHotels();
  }, [pagination.current_page, pagination.per_page]);

  const fetchHotels = async (params = {}) => {
    try {
      const response = await adminAPI.getHotels({
        ...params,
        page: pagination.current_page,
        per_page: pagination.per_page,
      });
      setHotels(response.data.data || []);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        per_page: response.data.per_page,
        total: response.data.total,
      });
    } catch (error) {
      console.error('Error fetching hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this hotel?')) return;
    try {
      await adminAPI.deleteHotel(id);
      setHotels(hotels.filter((hotel) => hotel.id !== id));
    } catch (error) {
      console.error('Error deleting hotel:', error);
    }
  };

  const toggleFeatured = async (id) => {
    try {
      const response = await adminAPI.toggleHotelFeatured(id);
      setHotels(hotels.map((hotel) =>
        hotel.id === id ? { ...hotel, is_featured: response.data.hotel.is_featured } : hotel
      ));
    } catch (error) {
      console.error('Error toggling featured:', error);
    }
  };

  const openEditModal = (hotel) => {
    setEditingHotel(hotel);
    setFormData({
      name: hotel.name,
      description: hotel.description || '',
      city: hotel.city,
      price_per_night: hotel.price_per_night,
      star_rating: hotel.star_rating,
      status: hotel.status,
      featured_image: hotel.featured_image || '',
    });
    setEditModal(true);
  };

  const closeEditModal = () => {
    setEditModal(false);
    setEditingHotel(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.updateHotel(editingHotel.id, formData);
      setHotels(hotels.map((h) => (h.id === editingHotel.id ? { ...h, ...formData } : h)));
      closeEditModal();
      alert('Hotel updated successfully!');
    } catch (error) {
      console.error('Error updating hotel:', error);
      alert('Failed to update hotel');
    }
  };

  const filteredHotels = hotels.filter((hotel) =>
    hotel.name.toLowerCase().includes(search.toLowerCase()) ||
    hotel.city.toLowerCase().includes(search.toLowerCase())
  );

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
        <h2 className="text-2xl font-bold text-gray-900">Manage Hotels</h2>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-primary-700">
          <Plus className="h-5 w-5 mr-2" />
          Add Hotel
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search hotels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hotel</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredHotels.map((hotel) => (
              <tr key={hotel.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-lg mr-3 overflow-hidden">
                      <img 
                        src={hotel.featured_image || getHotelImage(hotel.id)} 
                        alt={hotel.name} 
                        className="h-full w-full object-cover" 
                        onError={(e) => { e.target.src = getHotelImage(hotel.id); }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{hotel.name}</p>
                      <p className="text-sm text-gray-500">{hotel.star_rating} Star</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{hotel.city}</td>
                <td className="px-6 py-4 text-sm text-gray-900">${hotel.price_per_night}/night</td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm text-gray-900">{hotel.rating}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      hotel.status === 'active' ? 'bg-green-100 text-green-800' :
                      hotel.status === 'inactive' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {hotel.status}
                    </span>
                    {hotel.is_featured && (
                      <span className="px-2 py-1 text-xs rounded-full bg-primary-100 text-primary-800">
                        Featured
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => toggleFeatured(hotel.id)}
                      className={`p-2 rounded ${hotel.is_featured ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                      title="Toggle Featured"
                    >
                      <Star className={`h-5 w-5 ${hotel.is_featured ? 'fill-current' : ''}`} />
                    </button>
                    <button onClick={() => openEditModal(hotel)} className="p-2 text-blue-600 hover:text-blue-800" title="Edit">
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(hotel.id)}
                      className="p-2 text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-md">
        <p className="text-gray-600 mb-4 sm:mb-0">
          Showing {hotels.length} of {pagination.total} hotels
        </p>
        <div className="flex items-center space-x-4">
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
          
          {pagination.last_page > 1 && (
            <div className="flex items-center space-x-2">
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
        </div>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Edit Hotel</h3>
              <button onClick={closeEditModal} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name</label>
                <input type="text" required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows="3" value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" required value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per Night ($)</label>
                  <input type="number" required min="0" step="0.01" value={formData.price_per_night}
                    onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Star Rating</label>
                  <select value={formData.star_rating}
                    onChange={(e) => setFormData({ ...formData, star_rating: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                    <option value="3">3 Star</option>
                    <option value="4">4 Star</option>
                    <option value="5">5 Star</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Featured Image</label>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    value={formData.featured_image || ''}
                    onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Image URL or select from gallery..." 
                  />
                  <button
                    type="button"
                    onClick={() => setImageSelectorOpen(true)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center"
                  >
                    <ImageIcon className="h-5 w-5 mr-1" />
                    Select
                  </button>
                </div>
                {formData.featured_image && (
                  <div className="mt-2 relative">
                    <img 
                      src={formData.featured_image} 
                      alt="Preview" 
                      className="h-32 w-full object-cover rounded-lg"
                      onError={(e) => { e.target.src = getHotelImage(editingHotel?.id || 0); }}
                    />
                  </div>
                )}
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={closeEditModal}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Selector Modal */}
      <ImageSelector
        isOpen={imageSelectorOpen}
        onClose={() => setImageSelectorOpen(false)}
        onSelect={(url) => setFormData({ ...formData, featured_image: url })}
        category="hotels"
        currentImage={formData.featured_image}
      />
    </div>
  );
};

export default AdminHotels;
