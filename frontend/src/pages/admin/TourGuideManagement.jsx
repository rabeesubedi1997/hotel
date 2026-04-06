import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Upload, 
  Star, 
  MapPin, 
  Globe, 
  Award,
  Calendar,
  Check,
  X,
  DollarSign,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Database
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import MediaPicker from '../../components/MediaPicker';
import { Image as ImageIcon } from 'lucide-react';

const TourGuideCard = React.memo(({ guide, onEdit, onDelete, renderStarRating }) => {
  const handleError = useCallback((e) => {
    e.target.style.display = 'none';
    const fallback = e.target.nextSibling;
    if (fallback) fallback.style.display = 'flex';
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative h-48 bg-gray-200">
        {guide.image ? (
          <img 
            src={guide.image} 
            alt={guide.name} 
            className="w-full h-full object-cover"
            loading="lazy"
            onError={handleError}
          />
        ) : null}
        <div className={`w-full h-full flex items-center justify-center bg-primary-100 ${guide.image ? 'hidden' : 'flex'}`}>
          <Users className="h-16 w-16 text-primary-300" />
        </div>
        <div className="absolute top-2 right-2">
          {guide.is_available_for_hire ? (
            <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">Available</span>
          ) : (
            <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded-full">Not Available</span>
          )}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900">{guide.name}</h3>
        <p className="text-sm text-gray-500 mb-2">{guide.role}</p>
        
        {renderStarRating(guide.rating)}
        
        <div className="mt-3 flex items-center text-sm text-gray-600">
          <MapPin className="h-4 w-4 mr-1" />
          {guide.trips_completed} trips completed
        </div>
        
        {guide.hire_price_per_day && (
          <div className="mt-2 flex items-center text-sm text-primary-600 font-medium">
            <DollarSign className="h-4 w-4 mr-1" />
            ${guide.hire_price_per_day}/day
          </div>
        )}
        
        {guide.languages?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {guide.languages.map((lang, i) => (
              <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                {lang}
              </span>
            ))}
          </div>
        )}
        
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onEdit(guide)}
            className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </button>
          <button
            onClick={() => onDelete(guide.id)}
            className="flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

const TourGuideManagement = () => {
  const [guides, setGuides] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('guides');
  const [showModal, setShowModal] = useState(false);
  const [editingGuide, setEditingGuide] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  
  const defaultGuide = {
    name: '',
    role: 'Tour Guide',
    bio: '',
    image: '',
    trips_completed: 0,
    rating: 5.0,
    total_reviews: 0,
    is_available_for_hire: true,
    hire_price_per_day: null,
    languages: [],
    specialties: [],
    certifications: [],
    phone: '',
    email: '',
    is_active: true,
    display_order: 0,
  };

  const [formData, setFormData] = useState(defaultGuide);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    if (activeTab === 'guides') {
      fetchGuides();
    } else {
      fetchBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchGuides = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getTourGuides();
      setGuides(response.data);
    } catch (error) {
      console.error('Error fetching guides:', error);
      setMessage('Error loading tour guides');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getTourGuideBookings();
      setBookings(response.data.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setMessage('Error loading bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleImageSelect = useCallback((url) => {
    setFormData(prev => ({ ...prev, image: url }));
    setMediaPickerOpen(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingGuide) {
        await adminAPI.updateTourGuide(editingGuide.id, formData);
        setMessage('Tour guide updated successfully');
      } else {
        await adminAPI.createTourGuide(formData);
        setMessage('Tour guide created successfully');
      }
      
      setShowModal(false);
      setEditingGuide(null);
      setFormData(defaultGuide);
      fetchGuides();
    } catch (error) {
      console.error('Error saving guide:', error);
      setMessage(error.response?.data?.message || 'Error saving tour guide');
    }
  };

  const handleDelete = useCallback(async (id) => {
    if (!confirm('Are you sure you want to delete this tour guide?')) return;
    
    try {
      await adminAPI.deleteTourGuide(id);
      setMessage('Tour guide deleted successfully');
      hasFetchedRef.current = false;
      fetchGuides();
    } catch (error) {
      console.error('Error deleting guide:', error);
      setMessage('Error deleting tour guide');
    }
  }, [fetchGuides]);

  const handleUpdateBookingStatus = async (bookingId, status) => {
    try {
      await adminAPI.updateTourGuideBookingStatus(bookingId, status);
      setMessage('Booking status updated');
      fetchBookings();
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(prev => ({ ...prev, status }));
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      setMessage('Error updating booking status');
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm('This will add 6 default tour guides. Continue?')) return;
    
    try {
      setLoading(true);
      const response = await adminAPI.seedDefaultTourGuides();
      setMessage(`Added ${response.data.count} default tour guides`);
      fetchGuides();
    } catch (error) {
      console.error('Error seeding guides:', error);
      setMessage('Error adding default tour guides');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = useCallback((guide) => {
    setEditingGuide(guide);
    setFormData({
      ...defaultGuide,
      ...guide,
      languages: guide.languages || [],
      specialties: guide.specialties || [],
      certifications: guide.certifications || [],
    });
    setShowModal(true);
  }, []);

  const openCreateModal = () => {
    setEditingGuide(null);
    setFormData(defaultGuide);
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
      completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </span>
    );
  };

  const renderStarRating = useCallback((rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`h-4 w-4 ${
              i < fullStars 
                ? 'text-yellow-400 fill-yellow-400' 
                : i === fullStars && hasHalfStar 
                  ? 'text-yellow-400 fill-yellow-400/50' 
                  : 'text-gray-300'
            }`} 
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    );
  }, []);

  if (loading && guides.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Users className="h-6 w-6 mr-2" />
          Tour Guides
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('guides')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'guides' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Guides
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'bookings' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Bookings
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          <Check className="h-5 w-5 mr-2" />
          {message}
        </div>
      )}

      {activeTab === 'guides' && (
        <>
          <div className="mb-4 flex justify-between items-center">
            <button
              onClick={handleSeedDefaults}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              <Database className="h-4 w-4 mr-2" />
              Seed Default Guides
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tour Guide
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide) => (
              <TourGuideCard 
                key={guide.id} 
                guide={guide} 
                onEdit={openEditModal}
                onDelete={handleDelete}
                renderStarRating={renderStarRating}
              />
            ))}
          </div>
        </>
      )}

      {activeTab === 'bookings' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No bookings yet</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guide</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{booking.tour_guide?.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{booking.user?.name}</div>
                      <div className="text-xs text-gray-500">{booking.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(booking.booking_date).toLocaleDateString()} ({booking.duration_days} days)
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal for Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {editingGuide ? 'Edit Tour Guide' : 'Add Tour Guide'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-full overflow-hidden">
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-100">
                        <Users className="h-8 w-8 text-primary-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                      placeholder="Image URL or select from Media Library"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                    />
                    <button
                      type="button"
                      onClick={() => setMediaPickerOpen(true)}
                      className="flex items-center px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm text-blue-700"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Select from Media Library
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trips Completed</label>
                  <input
                    type="number"
                    value={formData.trips_completed}
                    onChange={(e) => setFormData(prev => ({ ...prev, trips_completed: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating (0-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.rating}
                    onChange={(e) => setFormData(prev => ({ ...prev, rating: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Reviews</label>
                  <input
                    type="number"
                    value={formData.total_reviews}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_reviews: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hire Price/Day ($)</label>
                  <input
                    type="number"
                    value={formData.hire_price_per_day || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, hire_price_per_day: e.target.value ? parseFloat(e.target.value) : null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Languages (comma separated)</label>
                <input
                  type="text"
                  value={formData.languages?.join(', ') || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  placeholder="English, Spanish, French"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialties (comma separated)</label>
                <input
                  type="text"
                  value={formData.specialties?.join(', ') || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialties: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  placeholder="Historical Tours, Adventure, Food Tours"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certifications (comma separated)</label>
                <input
                  type="text"
                  value={formData.certifications?.join(', ') || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, certifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  placeholder="Licensed Guide, First Aid Certified"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_available_for_hire}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_available_for_hire: e.target.checked }))}
                    className="mr-2"
                  />
                  Available for hire
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="mr-2"
                  />
                  Active
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  {editingGuide ? 'Update Guide' : 'Create Guide'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:shadow-md transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold">Booking Details</h2>
              <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Tour Guide</p>
                  <p className="font-medium">{selectedBooking.tour_guide?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  {getStatusBadge(selectedBooking.status)}
                </div>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 uppercase">Customer</p>
                <p className="font-medium">{selectedBooking.user?.name}</p>
                <p className="text-sm text-gray-600">{selectedBooking.user?.email}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Booking Date</p>
                  <p className="font-medium">{new Date(selectedBooking.booking_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Duration</p>
                  <p className="font-medium">{selectedBooking.duration_days} days</p>
                </div>
              </div>
              
              {selectedBooking.total_price && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Total Price</p>
                  <p className="font-medium">${selectedBooking.total_price}</p>
                </div>
              )}
              
              {selectedBooking.message && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Customer Message</p>
                  <p className="text-sm bg-gray-50 p-2 rounded">{selectedBooking.message}</p>
                </div>
              )}

              {selectedBooking.status !== 'completed' && selectedBooking.status !== 'cancelled' && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Update Status</p>
                  <div className="flex gap-2">
                    {selectedBooking.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'confirmed')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                      >
                        Confirm
                      </button>
                    )}
                    {selectedBooking.status === 'confirmed' && (
                      <button
                        onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'completed')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                      >
                        Mark Complete
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'cancelled')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <MediaPicker
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleImageSelect}
      />
    </div>
  );
};

export default TourGuideManagement;
