import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { vendorAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Textarea, Select, Modal, Card, Badge } from '../../components/ui';

const ACTIVITY_TYPES = [
  { value: 'bungee', label: 'Bungee' },
  { value: 'paragliding', label: 'Paragliding' },
  { value: 'rafting', label: 'Rafting' },
  { value: 'trekking', label: 'Trekking' },
  { value: 'zipline', label: 'Zipline' },
  { value: 'skydiving', label: 'Skydiving' },
  { value: 'canyoning', label: 'Canyoning' },
  { value: 'rock_climbing', label: 'Rock Climbing' },
  { value: 'hot_air_balloon', label: 'Hot Air Balloon' },
  { value: 'other', label: 'Other' },
];

const emptyForm = {
  name: '',
  description: '',
  type: 'other',
  location: '',
  city: '',
  duration: '',
  price: '',
  max_participants: '',
  difficulty_level: 'moderate',
  status: 'active',
};

const VendorActivities = () => {
  const toast = useToast();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await vendorAPI.getActivities();
      setActivities(response.data || []);
    } catch (error) {
      console.error('Failed to fetch activities', error);
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const openCreateModal = () => {
    setEditingActivity(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (activity) => {
    setEditingActivity(activity);
    setFormData({
      name: activity.name || '',
      description: activity.description || '',
      type: activity.type || 'other',
      location: activity.location || '',
      city: activity.city || '',
      duration: activity.duration || '',
      price: activity.price ?? '',
      max_participants: activity.max_participants ?? '',
      difficulty_level: activity.difficulty_level || 'moderate',
      status: activity.status || 'active',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingActivity(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingActivity) {
        const response = await vendorAPI.updateActivity(editingActivity.id, formData);
        setActivities((prev) =>
          prev.map((a) => (a.id === editingActivity.id ? response.data.activity : a))
        );
        toast.success('Activity updated successfully!');
      } else {
        const { status: _status, ...createData } = formData;
        const response = await vendorAPI.createActivity(createData);
        setActivities((prev) => [response.data.activity, ...prev]);
        toast.success('Activity created! New listings need admin approval before they go live.');
      }
      closeModal();
    } catch (error) {
      console.error('Error saving activity', error);
      toast.error(error.response?.data?.message || 'Failed to save activity');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) return;
    try {
      await vendorAPI.deleteActivity(id);
      setActivities((prev) => prev.filter((a) => a.id !== id));
      toast.success('Activity deleted successfully!');
    } catch (error) {
      console.error('Error deleting activity', error);
      toast.error('Failed to delete activity');
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
        <h1 className="font-display text-2xl font-bold text-neutral-900">Activities</h1>
        <Button variant="primary" onClick={openCreateModal}>
          <Plus className="h-5 w-5" />
          Add Activity
        </Button>
      </div>
      <p className="text-sm text-neutral-500 mb-6">
        New listings need admin approval before they go live.
      </p>

      {activities.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-neutral-500">No activities found</div>
          <p className="text-neutral-400 mt-2">Get started by adding your first activity</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity) => (
            <Card key={activity.id} hoverLift={false}>
              <div className="p-6">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display text-lg font-semibold text-neutral-900">{activity.name}</h3>
                  <Badge status={activity.approval_status || 'pending'} className="whitespace-nowrap">
                    {activity.approval_status || 'pending'}
                  </Badge>
                </div>
                <p className="text-neutral-600 text-sm mb-4">{activity.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-primary-600 font-semibold">${activity.price}</span>
                  <span className="text-sm text-neutral-500">{activity.duration}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openEditModal(activity)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(activity.id)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingActivity ? 'Edit Activity' : 'Add Activity'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Activity Name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Textarea
            label="Description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            <Select
              label="Difficulty Level"
              value={formData.difficulty_level}
              onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
            >
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="challenging">Challenging</option>
              <option value="extreme">Extreme</option>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Location"
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
            <Input
              label="City"
              type="text"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Price ($)"
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
            <Input
              label="Duration"
              type="text"
              required
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="e.g., 2 hours, 1 day"
            />
            <Input
              label="Max Participants"
              type="number"
              required
              min="1"
              value={formData.max_participants}
              onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
            />
          </div>
          {editingActivity && (
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="seasonal">Seasonal</option>
            </Select>
          )}
          {!editingActivity && (
            <p className="text-sm text-neutral-500">
              New listings need admin approval before they go live.
            </p>
          )}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving} className="flex-1">
              {editingActivity ? 'Save Changes' : 'Create Activity'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VendorActivities;
