import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Loader2, BedDouble, CalendarCheck, UtensilsCrossed } from 'lucide-react';
import { vendorAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Textarea, Select, Modal, Table, Th, Td, Badge, Pagination } from '../../components/ui';
import usePagination from '../../hooks/usePagination';

const emptyFormData = {
  name: '',
  description: '',
  address: '',
  city: '',
  district: '',
  price_per_night: '',
  status: 'active',
};

const emptyRoomForm = {
  room_type: '',
  room_number: '',
  description: '',
  price: '',
  capacity: '',
  available_count: '',
  bed_count: '',
  bed_type: '',
  status: 'available',
};

const VendorHotels = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);

  // Room management — per hotel, since Room rows are room *types*
  // ("Deluxe Double") with an available_count of how many exist, not
  // individually-numbered physical rooms.
  const [roomsModalHotel, setRoomsModalHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [bookedByRoom, setBookedByRoom] = useState({});
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomFormData, setRoomFormData] = useState(emptyRoomForm);
  const [savingRoom, setSavingRoom] = useState(false);
  const { pagination, applyResponse, goToPage, setPerPage } = usePagination();

  const fetchHotels = async (page = pagination.current_page, perPage = pagination.per_page) => {
    setLoading(true);
    try {
      const response = await vendorAPI.getHotels({ page, per_page: perPage });
      setHotels(response.data.data || []);
      applyResponse(response.data);
    } catch (error) {
      console.error('Failed to fetch hotels', error);
      toast.error('Failed to load hotels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels(pagination.current_page, pagination.per_page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page]);

  const openAddModal = () => {
    setEditingHotel(null);
    setFormData(emptyFormData);
    setEditModal(true);
  };

  const openEditModal = (hotel) => {
    setEditingHotel(hotel);
    setFormData({
      name: hotel.name || '',
      description: hotel.description || '',
      address: hotel.address || '',
      city: hotel.city || '',
      district: hotel.district || '',
      price_per_night: hotel.price_per_night ?? '',
      status: hotel.status || 'active',
    });
    setEditModal(true);
  };

  const closeEditModal = () => {
    setEditModal(false);
    setEditingHotel(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingHotel) {
        const response = await vendorAPI.updateHotel(editingHotel.id, formData);
        const updatedHotel = response.data.hotel;
        setHotels(hotels.map((h) => (h.id === editingHotel.id ? { ...h, ...updatedHotel } : h)));
        toast.success('Hotel updated successfully!');
        closeEditModal();
      } else {
        // status is not accepted on create; strip it out
        const { status, ...createData } = formData;
        const response = await vendorAPI.createHotel(createData);
        const newHotel = response.data.hotel;
        setHotels([newHotel, ...hotels]);
        toast.success('Hotel submitted successfully! New listings need admin approval before they go live.');
        closeEditModal();
      }
    } catch (error) {
      console.error('Error saving hotel:', error);
      const message = error.response?.data?.message || 'Failed to save hotel';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this hotel?')) return;
    try {
      await vendorAPI.deleteHotel(id);
      setHotels(hotels.filter((hotel) => hotel.id !== id));
      toast.success('Hotel deleted successfully!');
    } catch (error) {
      console.error('Error deleting hotel:', error);
      toast.error('Failed to delete hotel');
    }
  };

  const openRoomsModal = async (hotel) => {
    setRoomsModalHotel(hotel);
    setRoomsLoading(true);
    try {
      const [roomsRes, bookingsRes] = await Promise.all([
        vendorAPI.getHotelRooms(hotel.id),
        vendorAPI.getBookings(),
      ]);
      setRooms(roomsRes.data || []);

      // "Currently booked" per room type — active reservations (not
      // cancelled/refunded/checked_out) attached to that room. Room rows
      // are room *types*, so this counts reservations against the type,
      // not individually-numbered physical rooms.
      const counts = {};
      (bookingsRes.data || []).forEach((booking) => {
        if (!booking.room_id) return;
        if (['cancelled', 'refunded', 'checked_out'].includes(booking.status)) return;
        counts[booking.room_id] = (counts[booking.room_id] || 0) + 1;
      });
      setBookedByRoom(counts);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to load rooms');
    } finally {
      setRoomsLoading(false);
    }
  };

  const closeRoomsModal = () => {
    setRoomsModalHotel(null);
    setRooms([]);
    setBookedByRoom({});
  };

  const openAddRoomForm = () => {
    setEditingRoom(null);
    setRoomFormData(emptyRoomForm);
    setRoomFormOpen(true);
  };

  const openEditRoomForm = (room) => {
    setEditingRoom(room);
    setRoomFormData({
      room_type: room.room_type || '',
      room_number: room.room_number || '',
      description: room.description || '',
      price: room.price ?? '',
      capacity: room.capacity ?? '',
      available_count: room.available_count ?? '',
      bed_count: room.bed_count ?? '',
      bed_type: room.bed_type || '',
      status: room.status || 'available',
    });
    setRoomFormOpen(true);
  };

  const closeRoomForm = () => {
    setRoomFormOpen(false);
    setEditingRoom(null);
    setRoomFormData(emptyRoomForm);
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    setSavingRoom(true);
    try {
      if (editingRoom) {
        const response = await vendorAPI.updateRoom(editingRoom.id, roomFormData);
        setRooms((prev) => prev.map((r) => (r.id === editingRoom.id ? response.data.room : r)));
        toast.success('Room updated successfully!');
      } else {
        const response = await vendorAPI.createRoom(roomsModalHotel.id, roomFormData);
        setRooms((prev) => [response.data.room, ...prev]);
        toast.success('Room added successfully!');
      }
      closeRoomForm();
    } catch (error) {
      console.error('Error saving room:', error);
      toast.error(error.response?.data?.message || 'Failed to save room');
    } finally {
      setSavingRoom(false);
    }
  };

  const handleRoomDelete = async (roomId) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    try {
      await vendorAPI.deleteRoom(roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      toast.success('Room deleted successfully!');
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error('Failed to delete room');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <h2 className="font-display text-2xl font-bold text-neutral-900">My Hotels</h2>
        <Button onClick={openAddModal}>
          <Plus className="h-5 w-5 mr-2" />
          Add Hotel
        </Button>
      </div>
      <p className="text-sm text-neutral-500 mb-6">
        New listings need admin approval before they go live on the public site.
      </p>

      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Location</Th>
            <Th>Price / Night</Th>
            <Th>Rooms</Th>
            <Th>Status</Th>
            <Th>Approval</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {hotels.map((hotel) => (
            <tr key={hotel.id}>
              <Td className="font-medium text-neutral-900">{hotel.name}</Td>
              <Td>{hotel.city}, {hotel.district}</Td>
              <Td>${hotel.price_per_night}</Td>
              <Td>{hotel.rooms_count ?? 0}</Td>
              <Td>
                <Badge status={hotel.status} />
              </Td>
              <Td>
                <Badge status={hotel.approval_status || 'pending'} />
              </Td>
              <Td className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  <button onClick={() => openRoomsModal(hotel)} className="p-2 rounded-lg text-secondary-600 hover:bg-secondary-50 hover:text-secondary-800" title="Manage Rooms">
                    <BedDouble className="h-5 w-5" />
                  </button>
                  <button onClick={() => navigate(`/vendor/hotels/${hotel.id}/restaurant`)} className="p-2 rounded-lg text-orange-600 hover:bg-orange-50 hover:text-orange-800" title="Restaurant POS">
                    <UtensilsCrossed className="h-5 w-5" />
                  </button>
                  <button onClick={() => openEditModal(hotel)} className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 hover:text-primary-800" title="Edit">
                    <Edit className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleDelete(hotel.id)} className="p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-800" title="Delete">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </Td>
            </tr>
          ))}
          {hotels.length === 0 && (
            <tr>
              <td colSpan="7" className="px-4 sm:px-6 py-4 text-sm text-center text-neutral-500">
                No hotels found. Add your first hotel!
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      {pagination.total > 0 && (
        <div className="mt-6">
          <Pagination pagination={pagination} onPageChange={goToPage} onPerPageChange={setPerPage} itemLabel="hotels" />
        </div>
      )}

      <Modal
        open={editModal}
        onClose={closeEditModal}
        title={editingHotel ? 'Edit Hotel' : 'Add New Hotel'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
            label="Address"
            type="text"
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              type="text"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="District"
              type="text"
              required
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
            />
          </div>
          <Input
            label="Price per Night ($)"
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.price_per_night}
            onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
          />
          {editingHotel && (
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </Select>
          )}
          {!editingHotel && (
            <p className="text-xs text-neutral-500">
              New listings need admin approval before they go live on the public site.
            </p>
          )}
          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="secondary" fullWidth disabled={saving} onClick={closeEditModal}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={saving}>
              {editingHotel ? 'Update Hotel' : 'Create Hotel'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rooms — Room rows are room *types* ("Deluxe Double") with an
          available_count of how many exist, not individually-numbered
          physical rooms, so "booked" here means active reservations
          against that type, not a specific room number. */}
      <Modal
        open={!!roomsModalHotel}
        onClose={closeRoomsModal}
        title={roomsModalHotel ? `Rooms — ${roomsModalHotel.name}` : 'Rooms'}
        size="xl"
      >
        {roomsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {roomsModalHotel && roomsModalHotel.approval_status !== 'approved' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                This hotel is pending admin verification — room management unlocks once it's approved. You can still view existing rooms below.
              </div>
            )}
            <div className="flex justify-end">
              <Button size="sm" onClick={openAddRoomForm} disabled={roomsModalHotel?.approval_status !== 'approved'}>
                <Plus className="h-4 w-4" />
                Add Room Type
              </Button>
            </div>

            {rooms.length === 0 ? (
              <p className="text-center text-neutral-500 py-8">No room types added yet.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Room Type</Th>
                    <Th>Price / Night</Th>
                    <Th>Available</Th>
                    <Th>Booked</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rooms.map((room) => (
                    <tr key={room.id}>
                      <Td className="font-medium text-neutral-900">
                        {room.room_type}
                        {room.room_number && room.available_count <= 1 && <span className="text-neutral-400 font-normal"> · #{room.room_number}</span>}
                      </Td>
                      <Td>${room.price}</Td>
                      <Td>{room.available_count}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-1">
                          <CalendarCheck className="h-3.5 w-3.5 text-neutral-400" />
                          {bookedByRoom[room.id] || 0}
                        </span>
                      </Td>
                      <Td>
                        <Badge status={room.status} />
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openEditRoomForm(room)}
                            disabled={roomsModalHotel?.approval_status !== 'approved'}
                            className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRoomDelete(room.id)}
                            disabled={roomsModalHotel?.approval_status !== 'approved'}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete"
                          >
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
      </Modal>

      <Modal
        open={roomFormOpen}
        onClose={closeRoomForm}
        title={editingRoom ? 'Edit Room Type' : 'Add Room Type'}
        size="lg"
      >
        <form onSubmit={handleRoomSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Room Type"
              type="text"
              required
              placeholder="e.g., Deluxe Double"
              value={roomFormData.room_type}
              onChange={(e) => setRoomFormData({ ...roomFormData, room_type: e.target.value })}
            />
            <div>
              <Input
                label="Room Number (optional)"
                type="text"
                value={roomFormData.room_number}
                onChange={(e) => setRoomFormData({ ...roomFormData, room_number: e.target.value })}
                placeholder="e.g. 102 — only if this is one specific room"
                disabled={Number(roomFormData.available_count || 0) > 1}
              />
              <p className="mt-1 text-xs text-neutral-400">
                Only applies when Available Count is 1 — a room number identifies a single physical room, not a count of identical rooms.
              </p>
            </div>
          </div>
          <Textarea
            label="Description"
            rows={2}
            value={roomFormData.description}
            onChange={(e) => setRoomFormData({ ...roomFormData, description: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Price / Night ($)"
              type="number"
              required
              min="0"
              step="0.01"
              value={roomFormData.price}
              onChange={(e) => setRoomFormData({ ...roomFormData, price: e.target.value })}
            />
            <Input
              label="Capacity (guests)"
              type="number"
              required
              min="1"
              value={roomFormData.capacity}
              onChange={(e) => setRoomFormData({ ...roomFormData, capacity: e.target.value })}
            />
            <div>
              <Input
                label="Available Count"
                type="number"
                required
                min="0"
                value={roomFormData.available_count}
                onChange={(e) => {
                  const available_count = e.target.value;
                  // A room number identifies one specific room — once this
                  // represents more than one, it stops making sense and gets
                  // cleared automatically rather than left to show "5 Rooms"
                  // next to "Room 102".
                  setRoomFormData((prev) => ({
                    ...prev,
                    available_count,
                    room_number: Number(available_count) > 1 ? '' : prev.room_number,
                  }));
                }}
              />
              <p className="mt-1 text-xs text-neutral-400">
                How many identical rooms of this type exist — this drives availability, not the room number.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Bed Count"
              type="number"
              min="1"
              value={roomFormData.bed_count}
              onChange={(e) => setRoomFormData({ ...roomFormData, bed_count: e.target.value })}
            />
            <Input
              label="Bed Type"
              type="text"
              required
              placeholder="e.g., King, Twin"
              value={roomFormData.bed_type}
              onChange={(e) => setRoomFormData({ ...roomFormData, bed_type: e.target.value })}
            />
          </div>
          <Select
            label="Status"
            value={roomFormData.status}
            onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value })}
          >
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
            <option value="cleaning">Cleaning</option>
          </Select>
          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="secondary" fullWidth disabled={savingRoom} onClick={closeRoomForm}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={savingRoom}>
              {editingRoom ? 'Update Room' : 'Add Room'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VendorHotels;
