import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Star, Loader2, X, Image as ImageIcon, ChevronLeft, ChevronRight, BedDouble, Check, UserCog, UtensilsCrossed, LogIn } from 'lucide-react';
import { adminAPI, vendorAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getHotelImage } from '../../utils/images';
import MediaPicker from '../../components/MediaPicker';
import useAuthStore from '../../stores/authStore';
import useActingVendorStore from '../../stores/actingVendorStore';
import { Button, Input, Textarea, Select, Modal, Table, Th, Td, Badge } from '../../components/ui';

const AdminHotels = () => {
  const { user } = useAuthStore();
  const toast = useToast();
  const navigate = useNavigate();
  const { setActingVendor } = useActingVendorStore();

  // The vendor-side Restaurant POS page lives under /vendor/*, which
  // requires an "acting vendor" to be set for admin-level users (see
  // VendorLayout) purely so it doesn't bounce them to /select-vendor.
  // The backend controllers behind this page (Menu/Table/Order) already
  // bypass ownership checks entirely for admin-level users regardless of
  // that header, so for an admin-owned hotel with no vendor account we
  // just use the admin's own id as a stand-in — it's never actually
  // enforced against.
  const openRestaurantPos = (hotel) => {
    setActingVendor(hotel.user_id || user.id, hotel.name);
    navigate(`/vendor/hotels/${hotel.id}/restaurant`);
  };

  // "Login as" — enters this hotel owner's full Management System panel
  // (dashboard, hotels, bookings, restaurant POS, everything) exactly as
  // they'd see it themselves. Only meaningful when the hotel actually has
  // a vendor account behind it.
  const loginAsHotelOwner = (hotel) => {
    if (!hotel.user_id) {
      toast.error('This hotel has no vendor account to log in as.');
      return;
    }
    setActingVendor(hotel.user_id, hotel.user?.company_name || hotel.user?.name || hotel.name);
    navigate('/vendor');
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const vendorId = searchParams.get('vendor_id');
  const vendorName = searchParams.get('vendor_name');
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('hotel'); // 'hotel' or 'rooms'
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectingHotel, setRejectingHotel] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Determine which API to use based on user role
  const isVendor = user?.role === 'vendor';
  const api = isVendor ? vendorAPI : adminAPI;

  // Room management state
  const [roomsModal, setRoomsModal] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomFormData, setRoomFormData] = useState({
    room_type: '',
    room_number: '',
    description: '',
    price: '',
    capacity: 2,
    available_count: 1,
    bed_count: 1,
    bed_type: 'Queen',
    amenities: [],
    status: 'available',
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    city: '',
    address: '',
    district: '',
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

  const fetchHotels = async (params = {}) => {
    try {
      const response = await api.getHotels({
        ...params,
        ...(vendorId ? { user_id: vendorId } : {}),
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

  useEffect(() => {
    fetchHotels();
  }, [pagination.current_page, pagination.per_page, vendorId]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this hotel?')) return;
    try {
      await api.deleteHotel(id);
      setHotels(hotels.filter((hotel) => hotel.id !== id));
    } catch (error) {
      console.error('Error deleting hotel:', error);
    }
  };

  const toggleFeatured = async (id) => {
    try {
      const response = await api.toggleHotelFeatured(id);
      setHotels(hotels.map((hotel) =>
        hotel.id === id ? { ...hotel, is_featured: response.data.hotel.is_featured } : hotel
      ));
    } catch (error) {
      console.error('Error toggling featured:', error);
    }
  };

  const handleApprove = async (id) => {
    try {
      await adminAPI.approveHotel(id, { status: 'approved' });
      setHotels(hotels.map((hotel) =>
        hotel.id === id ? { ...hotel, approval_status: 'approved' } : hotel
      ));
      toast.success('Hotel approved successfully!');
    } catch (error) {
      console.error('Error approving hotel:', error);
      toast.error('Failed to approve hotel');
    }
  };

  const openRejectModal = (hotel) => {
    setRejectingHotel(hotel);
    setRejectReason('');
    setRejectModal(true);
  };

  const closeRejectModal = () => {
    setRejectModal(false);
    setRejectingHotel(null);
    setRejectReason('');
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    try {
      await adminAPI.approveHotel(rejectingHotel.id, { status: 'rejected', rejection_reason: rejectReason });
      setHotels(hotels.map((hotel) =>
        hotel.id === rejectingHotel.id ? { ...hotel, approval_status: 'rejected', rejection_reason: rejectReason } : hotel
      ));
      toast.success('Hotel rejected.');
      closeRejectModal();
    } catch (error) {
      console.error('Error rejecting hotel:', error);
      toast.error('Failed to reject hotel');
    }
  };

  const openEditModal = (hotel) => {
    setEditingHotel(hotel);
    setActiveTab('hotel'); // Reset to hotel tab
    setFormData({
      name: hotel.name,
      description: hotel.description || '',
      city: hotel.city,
      address: hotel.address || '',
      district: hotel.district || '',
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
    setFormData({
      name: '',
      description: '',
      city: '',
      address: '',
      district: '',
      price_per_night: '',
      star_rating: '',
      status: 'active',
      featured_image: '',
    });
  };

  const openRoomsModal = (hotel) => {
    setEditingHotel(hotel);
    setActiveTab('rooms'); // Go directly to rooms tab
    setFormData({
      name: hotel.name,
      description: hotel.description,
      city: hotel.city,
      address: hotel.address,
      district: hotel.district,
      price_per_night: hotel.price_per_night,
      star_rating: hotel.star_rating,
      status: hotel.status,
      featured_image: hotel.featured_image,
    });
    setEditModal(true);
  };

  const handleAddHotel = () => {
    setEditingHotel(null);
    setActiveTab('hotel'); // Reset to hotel tab
    setFormData({
      name: '',
      description: '',
      city: '',
      address: '',
      district: '',
      price_per_night: '',
      star_rating: '',
      status: 'active',
      featured_image: '',
    });
    setEditModal(true);
  };

  // Room Management Functions
  const loadRoomsForHotel = async (hotel) => {
    if (!hotel || !hotel.id) {
      setRooms([]);
      return;
    }
    try {
      const response = await api.getHotelRooms(hotel.id);
      setRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
      // Don't show toast for new hotels (expected behavior)
      if (error.response?.status !== 404) {
        toast.error('Failed to load rooms');
      }
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'rooms' && editingHotel && editingHotel.id) {
      loadRoomsForHotel(editingHotel);
    }
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        // Update existing room
        const response = await api.updateRoom(editingRoom.id, roomFormData);
        setRooms(rooms.map(r => r.id === editingRoom.id ? response.data.room : r));
        toast.success('Room updated successfully!');
      } else {
        // Create new room
        const response = await api.createRoom(editingHotel.id, roomFormData);
        setRooms([...rooms, response.data.room]);
        toast.success('Room created successfully!');
      }

      // Reset form
      setEditingRoom(null);
      setRoomFormData({
        room_type: '',
        room_number: '',
        description: '',
        price: '',
        capacity: 2,
        available_count: 1,
        bed_count: 1,
        bed_type: 'Queen',
        amenities: [],
        status: 'available',
      });
    } catch (error) {
      console.error('Error saving room:', error);
      toast.error('Failed to save room');
    }
  };

  const deleteRoom = async (roomId) => {
    if (confirm('Are you sure you want to delete this room?')) {
      try {
        await api.deleteRoom(roomId);
        setRooms(rooms.filter(r => r.id !== roomId));
        toast.success('Room deleted successfully!');
      } catch (error) {
        console.error('Error deleting room:', error);
        toast.error('Failed to delete room');
      }
    }
  };

  const editRoom = (room) => {
    setEditingRoom(room);
    setRoomFormData({
      room_type: room.room_type,
      room_number: room.room_number || '',
      description: room.description || '',
      price: room.price,
      capacity: room.capacity,
      available_count: room.available_count,
      bed_count: room.bed_count || 1,
      bed_type: room.bed_type,
      amenities: room.amenities || [],
      status: room.status,
    });
  };

  const handleImageSelect = (url) => {
    setFormData(prev => ({ ...prev, featured_image: url }));
    setMediaPickerOpen(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      if (editingHotel) {
        // Update existing hotel
        await api.updateHotel(editingHotel.id, formData);
        setHotels(hotels.map((h) => (h.id === editingHotel.id ? { ...h, ...formData } : h)));
        toast.success('Hotel updated successfully!');
        closeEditModal();

        // Auto-switch to rooms tab after update
        setActiveTab('rooms');
        setTimeout(() => loadRoomsForHotel(editingHotel), 100);
        toast.success('Hotel updated! You can now manage rooms for this hotel.');
      } else {
        // Create new hotel
        const response = await api.createHotel(formData);
        const newHotel = response.data.hotel;
        setHotels([newHotel, ...hotels]);
        toast.success('Hotel created successfully!');
        closeEditModal();

        // Auto-switch to rooms tab and load rooms for new hotel
        setActiveTab('rooms');
        setTimeout(() => loadRoomsForHotel(newHotel), 100);
        toast.success('Hotel created! You can now add rooms to this hotel.');
      }
    } catch (error) {
      console.error('Error saving hotel:', error);
      toast.error('Failed to save hotel');
    }
  };

  const filteredHotels = hotels.filter((hotel) =>
    hotel.name.toLowerCase().includes(search.toLowerCase()) ||
    hotel.city.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-neutral-900">Manage Hotels</h2>
        {user && ['admin', 'manager', 'super_admin'].includes(user.role) && (
          <Button onClick={handleAddHotel}>
            <Plus className="h-5 w-5 mr-2" />
            Add Hotel
          </Button>
        )}
      </div>

      {vendorId && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <UserCog className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Viewing {vendorName || 'this vendor'}'s hotels — superadmin oversight
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>
            Exit oversight view
          </Button>
        </div>
      )}

      <div className="flex items-center space-x-4">
        <Input
          icon={Search}
          type="text"
          placeholder="Search hotels..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Hotel</Th>
            <Th>City</Th>
            <Th>Price</Th>
            <Th>Rating</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {filteredHotels.map((hotel) => (
            <tr key={hotel.id}>
              <Td className="whitespace-normal">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <img
                      src={getHotelImage(hotel.id)}
                      alt={hotel.name}
                      className="h-12 w-12 rounded-lg object-cover"
                      onError={(e) => { e.target.src = getHotelImage(hotel.id); }}
                    />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-neutral-900">{hotel.name}</div>
                    <div className="text-sm text-neutral-500">{hotel.city}</div>
                  </div>
                </div>
              </Td>
              <Td>${hotel.price_per_night}/night</Td>
              <Td>
                <Badge tone={hotel.star_rating >= 4 ? 'warning' : 'neutral'}>{hotel.star_rating} Star</Badge>
              </Td>
              <Td>
                <div className="flex items-center space-x-2">
                  <Badge status={hotel.status} />
                  <span
                    title={hotel.approval_status === 'rejected' && hotel.rejection_reason ? hotel.rejection_reason : undefined}
                  >
                    <Badge status={hotel.approval_status || 'pending'} />
                  </span>
                </div>
              </Td>
              <Td className="text-right">
                {user && ['admin', 'manager', 'super_admin'].includes(user.role) && (
                  <div className="flex items-center justify-end space-x-2">
                    {hotel.approval_status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(hotel.id)} className="p-2 rounded-lg text-green-600 hover:bg-green-50 hover:text-green-800" title="Approve">
                          <Check className="h-5 w-5" />
                        </button>
                        <button onClick={() => openRejectModal(hotel)} className="p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-800" title="Reject">
                          <X className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    <button onClick={() => openEditModal(hotel)} className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 hover:text-primary-800" title="Edit">
                      <Edit className="h-5 w-5" />
                    </button>
                    <button onClick={() => openRoomsModal(hotel)} className="p-2 rounded-lg text-green-600 hover:bg-green-50 hover:text-green-800" title="Manage Rooms">
                      <BedDouble className="h-5 w-5" />
                    </button>
                    <button onClick={() => openRestaurantPos(hotel)} className="p-2 rounded-lg text-orange-600 hover:bg-orange-50 hover:text-orange-800" title="Restaurant POS">
                      <UtensilsCrossed className="h-5 w-5" />
                    </button>
                    <button onClick={() => loginAsHotelOwner(hotel)} className="p-2 rounded-lg text-secondary-600 hover:bg-secondary-50 hover:text-secondary-800" title="Login as Vendor">
                      <LogIn className="h-5 w-5" />
                    </button>
                    <button onClick={() => toggleFeatured(hotel.id)} className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-800" title="Toggle Featured">
                      <Star className={`h-5 w-5 ${hotel.is_featured ? 'fill-current' : ''}`} />
                    </button>
                    <button onClick={() => handleDelete(hotel.id)} className="p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-800" title="Delete">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Edit Modal */}
      <Modal
        open={editModal}
        onClose={closeEditModal}
        title={editingHotel ? 'Edit Hotel' : 'Add New Hotel'}
        size="xl"
      >
        {/* Tabs */}
        <div className="border-b border-neutral-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('hotel')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'hotel'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              Hotel Details
            </button>
            <button
              onClick={() => handleTabChange('rooms')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rooms'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              Room Management
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'hotel' && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <Input
              label="Hotel Name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Textarea
              label="Description"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Input
              label="City"
              type="text"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="Address"
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <Input
              label="District"
              type="text"
              required
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Price per Night ($)"
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.price_per_night}
                onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
              />
              <Select
                label="Star Rating"
                value={formData.star_rating}
                onChange={(e) => setFormData({ ...formData, star_rating: e.target.value })}
              >
                <option value="3">3 Star</option>
                <option value="4">4 Star</option>
                <option value="5">5 Star</option>
              </Select>
            </div>
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Featured Image</label>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  value={formData.featured_image || ''}
                  onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                  className="flex-1"
                  placeholder="Image URL or select from gallery..."
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setMediaPickerOpen(true)}
                >
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Select from Media Library
                </Button>
              </div>
            </div>
            {formData.featured_image && (
              <div className="mt-2 relative">
                <img
                  src={formData.featured_image}
                  alt="Preview"
                  className="h-32 w-full object-cover rounded-xl"
                  onError={(e) => { e.target.src = getHotelImage(editingHotel?.id || 0); }}
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, featured_image: '' })}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="secondary" fullWidth onClick={closeEditModal}>
                Cancel
              </Button>
              <Button type="submit" fullWidth>
                {editingHotel ? 'Update Hotel' : 'Create Hotel'}
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'rooms' && (
          <div className="space-y-6">
            {/* Hotel Selector for Room Management */}
            {!editingHotel && hotels.length > 0 && (
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6">
                <Select
                  label="Select Hotel to Manage Rooms:"
                  value=""
                  onChange={(e) => {
                    const hotelId = e.target.value;
                    const hotel = hotels.find(h => h.id == hotelId);
                    if (hotel) {
                      setEditingHotel(hotel);
                      loadRoomsForHotel(hotel);
                    }
                  }}
                >
                  <option value="">Choose a hotel...</option>
                  {hotels.map(hotel => (
                    <option key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {editingHotel && (
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-primary-900">Managing Rooms for: {editingHotel.name}</h4>
                  <button
                    onClick={() => {
                      setEditingHotel(null);
                      setRooms([]);
                      setRoomFormData({
                        room_type: '',
                        room_number: '',
                        description: '',
                        price: '',
                        capacity: 2,
                        available_count: 1,
                        bed_count: 1,
                        bed_type: 'Queen',
                        amenities: [],
                        status: 'available',
                      });
                    }}
                    className="text-primary-600 hover:text-primary-800 text-sm"
                  >
                    Clear Hotel Selection
                  </button>
                </div>
              </div>
            )}

            {/* Room Form */}
            <div className="bg-neutral-50 rounded-xl p-4">
              <h4 className="font-semibold text-neutral-900 mb-4">
                {editingRoom ? 'Edit Room' : 'Add New Room'}
              </h4>
              <form onSubmit={handleRoomSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="Room Type *"
                  type="text"
                  required
                  value={roomFormData.room_type}
                  onChange={(e) => setRoomFormData({ ...roomFormData, room_type: e.target.value })}
                  placeholder="e.g. Deluxe, Suite"
                />
                <Input
                  label="Room Number"
                  type="text"
                  value={roomFormData.room_number}
                  onChange={(e) => setRoomFormData({ ...roomFormData, room_number: e.target.value })}
                />
                <Textarea
                  label="Description"
                  rows="3"
                  value={roomFormData.description}
                  onChange={(e) => setRoomFormData({ ...roomFormData, description: e.target.value })}
                />
                <Input
                  label="Price per Night"
                  type="number"
                  min="0"
                  step="0.01"
                  value={roomFormData.price}
                  onChange={(e) => setRoomFormData({ ...roomFormData, price: e.target.value })}
                />
                <Input
                  label="Capacity"
                  type="number"
                  min="1"
                  value={roomFormData.capacity}
                  onChange={(e) => setRoomFormData({ ...roomFormData, capacity: e.target.value })}
                />
                <Input
                  label="Available Count"
                  type="number"
                  min="0"
                  value={roomFormData.available_count}
                  onChange={(e) => setRoomFormData({ ...roomFormData, available_count: e.target.value })}
                />
                <Select
                  label="Status"
                  value={roomFormData.status}
                  onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value })}
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </Select>
                <div className="md:col-span-2 lg:col-span-3 flex space-x-3">
                  <Button type="submit" size="sm">
                    {editingRoom ? 'Update Room' : 'Add Room'}
                  </Button>
                  {editingRoom && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => setEditingRoom(null)}>
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* Rooms List */}
            {editingHotel && (
              <div>
                <h4 className="font-semibold text-neutral-900 mb-4">Rooms for {editingHotel.name} ({rooms.length})</h4>
                {rooms.length === 0 ? (
                  <p className="text-neutral-500 text-center py-8">No rooms added yet. Add your first room above.</p>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <Th>Room Type</Th>
                        <Th>Number</Th>
                        <Th>Price</Th>
                        <Th>Capacity</Th>
                        <Th>Bed Info</Th>
                        <Th>Available</Th>
                        <Th className="text-right">Actions</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {rooms.map((room) => (
                        <tr key={room.id} className="hover:bg-neutral-50">
                          <Td className="whitespace-normal">
                            <div className="font-medium text-neutral-900">{room.room_type}</div>
                            {room.description && (
                              <div className="text-xs text-neutral-500 mt-1 line-clamp-1">
                                {room.description}
                              </div>
                            )}
                          </Td>
                          <Td>{room.room_number || '-'}</Td>
                          <Td className="font-semibold text-neutral-900">${room.price}/night</Td>
                          <Td>{room.capacity} guests</Td>
                          <Td>{room.bed_type} ({room.bed_count || 1})</Td>
                          <Td>
                            <Badge tone={room.available_count > 0 ? 'success' : 'danger'}>
                              {room.available_count} rooms
                            </Badge>
                          </Td>
                          <Td className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button onClick={() => editRoom(room)} className="p-1 rounded-lg text-primary-600 hover:bg-primary-50 hover:text-primary-800" title="Edit Room">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button onClick={() => deleteRoom(room.id)} className="p-1 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-800" title="Delete Room">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={rejectModal}
        onClose={closeRejectModal}
        title="Reject Hotel"
        size="sm"
      >
        <form onSubmit={handleReject} className="space-y-4">
          <Textarea
            label="Rejection Reason"
            rows="3"
            required
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain why this hotel is being rejected..."
          />
          <div className="flex space-x-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={closeRejectModal}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" fullWidth>
              Reject Hotel
            </Button>
          </div>
        </form>
      </Modal>

      <MediaPicker
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleImageSelect}
      />
    </div>
  );
};

export default AdminHotels;
