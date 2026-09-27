import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { vendorAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Textarea, Select, Modal, Table, Th, Td, Badge } from '../../components/ui';

const emptyFormData = {
  name: '',
  description: '',
  address: '',
  city: '',
  district: '',
  price_per_night: '',
  status: 'active',
};

const VendorHotels = () => {
  const toast = useToast();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);

  const fetchHotels = async () => {
    try {
      const response = await vendorAPI.getHotels();
      setHotels(response.data || []);
    } catch (error) {
      console.error('Failed to fetch hotels', error);
      toast.error('Failed to load hotels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    </div>
  );
};

export default VendorHotels;
