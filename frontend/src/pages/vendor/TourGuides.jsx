import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { vendorAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Textarea, Modal, Card, Badge } from '../../components/ui';

const emptyForm = {
  name: '',
  role: 'Tour Guide',
  bio: '',
  hire_price_per_day: '',
  phone: '',
  email: '',
  is_available_for_hire: true,
};

const VendorTourGuides = () => {
  const toast = useToast();
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const fetchGuides = useCallback(async () => {
    try {
      setLoading(true);
      const response = await vendorAPI.getTourGuides();
      setGuides(response.data || []);
    } catch (error) {
      console.error('Failed to fetch tour guides', error);
      toast.error('Failed to load tour guides');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchGuides();
  }, [fetchGuides]);

  const openCreateModal = () => {
    setEditingGuide(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (guide) => {
    setEditingGuide(guide);
    setFormData({
      name: guide.name || '',
      role: guide.role || 'Tour Guide',
      bio: guide.bio || '',
      hire_price_per_day: guide.hire_price_per_day ?? '',
      phone: guide.phone || '',
      email: guide.email || '',
      is_available_for_hire: guide.is_available_for_hire ?? true,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingGuide(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingGuide) {
        const response = await vendorAPI.updateTourGuide(editingGuide.id, formData);
        setGuides((prev) => prev.map((g) => (g.id === editingGuide.id ? response.data.guide : g)));
        toast.success('Tour guide service updated successfully!');
      } else {
        const response = await vendorAPI.createTourGuide(formData);
        setGuides((prev) => [response.data.guide, ...prev]);
        toast.success('Tour guide service submitted! New listings need admin approval before they go live.');
      }
      closeModal();
    } catch (error) {
      console.error('Error saving tour guide', error);
      toast.error(error.response?.data?.message || 'Failed to save tour guide service');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tour guide service?')) return;
    try {
      await vendorAPI.deleteTourGuide(id);
      setGuides((prev) => prev.filter((g) => g.id !== id));
      toast.success('Tour guide service deleted successfully!');
    } catch (error) {
      console.error('Error deleting tour guide', error);
      toast.error('Failed to delete tour guide service');
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
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Tour Guide Services</h1>
        <Button variant="primary" onClick={openCreateModal}>
          <Plus className="h-5 w-5" />
          Add Guide
        </Button>
      </div>
      <p className="text-sm text-neutral-500 mb-6">
        New guide listings need admin approval before they go live.
      </p>

      {guides.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-neutral-500">No tour guide services found</div>
          <p className="text-neutral-400 mt-2">Get started by adding your first guide</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guides.map((guide) => (
            <Card key={guide.id} hoverLift={false}>
              <div className="p-6">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display text-lg font-semibold text-neutral-900">{guide.name}</h3>
                  <Badge status={guide.approval_status || 'pending'} className="whitespace-nowrap">
                    {guide.approval_status || 'pending'}
                  </Badge>
                </div>
                <p className="text-neutral-500 text-sm mb-1">{guide.role}</p>
                <p className="text-neutral-600 text-sm mb-4 line-clamp-2">{guide.bio}</p>
                <div className="flex justify-between items-center">
                  <span className="text-primary-600 font-semibold">
                    {guide.hire_price_per_day ? `$${guide.hire_price_per_day}/day` : 'Rate not set'}
                  </span>
                  <span className="text-sm text-neutral-500">
                    {guide.is_available_for_hire ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="primary" size="sm" onClick={() => openEditModal(guide)} className="flex-1">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(guide.id)} className="flex-1">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editingGuide ? 'Edit Guide' : 'Add Guide'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Guide Name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Role / Specialty"
            type="text"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            placeholder="e.g., Trekking Guide, Rafting Instructor"
          />
          <Textarea
            label="Bio"
            rows={3}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Hire Price per Day ($)"
              type="number"
              min="0"
              step="0.01"
              value={formData.hire_price_per_day}
              onChange={(e) => setFormData({ ...formData, hire_price_per_day: e.target.value })}
            />
            <Input
              label="Phone"
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={formData.is_available_for_hire}
              onChange={(e) => setFormData({ ...formData, is_available_for_hire: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-300 text-primary-600"
            />
            Available for hire
          </label>
          {!editingGuide && (
            <p className="text-sm text-neutral-500">
              New listings need admin approval before they go live.
            </p>
          )}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving} className="flex-1">
              {editingGuide ? 'Save Changes' : 'Add Guide'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VendorTourGuides;
