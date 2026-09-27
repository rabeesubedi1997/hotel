import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Calendar,
  Check,
  DollarSign,
  Eye,
  Database
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import MediaPicker from '../../components/MediaPicker';
import { Image as ImageIcon } from 'lucide-react';
import { Button, Input, Textarea, Card, Badge, RatingStars, Modal, Table, Th, Td } from '../../components/ui';

const TourGuideCard = React.memo(({ guide, onEdit, onDelete }) => {
  const handleError = useCallback((e) => {
    e.target.style.display = 'none';
    const fallback = e.target.nextSibling;
    if (fallback) fallback.style.display = 'flex';
  }, []);

  return (
    <Card className="flex flex-col">
      <div className="relative h-48 bg-neutral-200">
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
        <div className="absolute top-3 right-3">
          {guide.is_available_for_hire ? (
            <Badge tone="success">Available</Badge>
          ) : (
            <Badge tone="neutral">Not Available</Badge>
          )}
        </div>
        {!guide.is_active && (
          <div className="absolute top-3 left-3">
            <Badge tone="danger">Inactive</Badge>
          </div>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-display text-lg font-semibold text-neutral-900">{guide.name}</h3>
        <p className="text-sm text-neutral-500 mb-2">{guide.role}</p>

        <RatingStars rating={guide.rating} reviewCount={guide.total_reviews} size="sm" />

        <div className="mt-3 flex items-center text-sm text-neutral-600">
          <MapPin className="h-4 w-4 mr-1 text-primary-500 flex-shrink-0" />
          {guide.trips_completed} trips completed
        </div>

        {guide.hire_price_per_day && (
          <div className="mt-2 flex items-center text-sm text-primary-600 font-semibold">
            <DollarSign className="h-4 w-4 mr-1" />
            ${guide.hire_price_per_day}/day
          </div>
        )}

        {guide.languages?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {guide.languages.map((lang, i) => (
              <Badge key={i} tone="primary">{lang}</Badge>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-neutral-100 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => onEdit(guide)}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => onDelete(guide.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
});

const TourGuideManagement = () => {
  const [guides, setGuides] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'bookings' ? 'bookings' : 'guides');
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

  const STATUS_BADGE_TONE = {
    pending: 'warning',
    confirmed: 'primary',
    completed: 'success',
    cancelled: 'danger',
  };

  const getStatusBadge = (status) => (
    <Badge tone={STATUS_BADGE_TONE[status] || 'neutral'}>{status}</Badge>
  );

  if (loading && guides.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-display text-2xl font-bold text-neutral-900 flex items-center">
          <Users className="h-6 w-6 mr-2 text-primary-600" />
          Tour Guides
        </h2>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={activeTab === 'guides' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('guides')}
          >
            Guides
          </Button>
          <Button
            type="button"
            variant={activeTab === 'bookings' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('bookings')}
          >
            Bookings
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center text-sm font-medium ${message.toLowerCase().includes('error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          <Check className="h-5 w-5 mr-2 flex-shrink-0" />
          {message}
        </div>
      )}

      {activeTab === 'guides' && (
        <>
          <div className="flex justify-between items-center flex-wrap gap-3">
            <Button
              type="button"
              variant="accent"
              size="md"
              onClick={handleSeedDefaults}
              disabled={loading}
            >
              <Database className="h-4 w-4 mr-2" />
              Seed Default Guides
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={openCreateModal}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tour Guide
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide) => (
              <TourGuideCard
                key={guide.id}
                guide={guide}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {activeTab === 'bookings' && (
        <>
          {bookings.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-card text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
              <p className="text-neutral-500">No bookings yet</p>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Guide</Th>
                  <Th>Customer</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-neutral-50">
                    <Td>
                      <div className="text-sm font-medium text-neutral-900">{booking.tour_guide?.name}</div>
                    </Td>
                    <Td>
                      <div className="text-sm text-neutral-900">{booking.user?.name}</div>
                      <div className="text-xs text-neutral-500">{booking.user?.email}</div>
                    </Td>
                    <Td className="text-neutral-500">
                      {new Date(booking.booking_date).toLocaleDateString()} ({booking.duration_days} days)
                    </Td>
                    <Td>
                      {getStatusBadge(booking.status)}
                    </Td>
                    <Td className="text-right">
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 hover:text-primary-800"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}

      {/* Modal for Create/Edit */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingGuide ? 'Edit Tour Guide' : 'Add Tour Guide'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Profile Image</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-neutral-200 rounded-full overflow-hidden flex-shrink-0">
                {formData.image ? (
                  <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-100">
                    <Users className="h-8 w-8 text-primary-300" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <Input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                  placeholder="Image URL or select from Media Library"
                  className="mb-2"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setMediaPickerOpen(true)}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Select from Media Library
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Name *"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label="Role"
              type="text"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
            />
          </div>

          <Textarea
            label="Bio"
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            rows={3}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Trips Completed"
              type="number"
              value={formData.trips_completed}
              onChange={(e) => setFormData(prev => ({ ...prev, trips_completed: parseInt(e.target.value) || 0 }))}
            />
            <Input
              label="Rating (0-5)"
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={formData.rating}
              onChange={(e) => setFormData(prev => ({ ...prev, rating: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              label="Total Reviews"
              type="number"
              value={formData.total_reviews}
              onChange={(e) => setFormData(prev => ({ ...prev, total_reviews: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Hire Price/Day ($)"
              type="number"
              value={formData.hire_price_per_day || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, hire_price_per_day: e.target.value ? parseFloat(e.target.value) : null }))}
            />
            <Input
              label="Display Order"
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <Input
            label="Languages (comma separated)"
            type="text"
            value={formData.languages?.join(', ') || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
            placeholder="English, Spanish, French"
          />

          <Input
            label="Specialties (comma separated)"
            type="text"
            value={formData.specialties?.join(', ') || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, specialties: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
            placeholder="Historical Tours, Adventure, Food Tours"
          />

          <Input
            label="Certifications (comma separated)"
            type="text"
            value={formData.certifications?.join(', ') || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, certifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
            placeholder="Licensed Guide, First Aid Certified"
          />

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={formData.is_available_for_hire}
                onChange={(e) => setFormData(prev => ({ ...prev, is_available_for_hire: e.target.checked }))}
                className="h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              />
              Available for hire
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              />
              Active
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" fullWidth>
              {editingGuide ? 'Update Guide' : 'Create Guide'}
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Booking Detail Modal */}
      <Modal
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Booking Details"
        size="md"
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Tour Guide</p>
                <p className="font-medium text-neutral-900">{selectedBooking.tour_guide?.name}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Status</p>
                {getStatusBadge(selectedBooking.status)}
              </div>
            </div>

            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Customer</p>
              <p className="font-medium text-neutral-900">{selectedBooking.user?.name}</p>
              <p className="text-sm text-neutral-600">{selectedBooking.user?.email}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Booking Date</p>
                <p className="font-medium text-neutral-900">{new Date(selectedBooking.booking_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Duration</p>
                <p className="font-medium text-neutral-900">{selectedBooking.duration_days} days</p>
              </div>
            </div>

            {selectedBooking.total_price && (
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Total Price</p>
                <p className="font-medium text-neutral-900">${selectedBooking.total_price}</p>
              </div>
            )}

            {selectedBooking.message && (
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Customer Message</p>
                <p className="text-sm bg-neutral-50 p-3 rounded-xl text-neutral-700">{selectedBooking.message}</p>
              </div>
            )}

            {selectedBooking.status !== 'completed' && selectedBooking.status !== 'cancelled' && (
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {selectedBooking.status === 'pending' && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'confirmed')}
                    >
                      Confirm
                    </Button>
                  )}
                  {selectedBooking.status === 'confirmed' && (
                    <Button
                      type="button"
                      variant="accent"
                      size="sm"
                      onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'completed')}
                    >
                      Mark Complete
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'cancelled')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
      <MediaPicker
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleImageSelect}
      />
    </div>
  );
};

export default TourGuideManagement;
