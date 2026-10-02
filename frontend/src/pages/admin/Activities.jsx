import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Star, Loader2, X, Image as ImageIcon, Check, UserCog, LogIn } from 'lucide-react';
import { adminAPI, vendorAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getActivityImage, fallbackOnce } from '../../utils/images';
import MediaPicker from '../../components/MediaPicker';
import useAuthStore from '../../stores/authStore';
import useActingVendorStore from '../../stores/actingVendorStore';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Textarea, Select, Modal, Table, Th, Td, Badge, Pagination } from '../../components/ui';
import usePagination from '../../hooks/usePagination';

  const ActivityRow = React.memo(({ activity, onToggleFeatured, onEdit, onDelete, onApprove, onReject, onLoginAsVendor, getDifficultyColor, getActivityImage, user }) => {
    const handleImageError = useCallback((e) => fallbackOnce(getActivityImage(activity.type))(e), [activity.type, getActivityImage]);

    return (
      <tr>
        <Td>
          <div className="flex items-center" style={{ whiteSpace: 'normal' }}>
            <div className="h-10 w-10 rounded-lg mr-3 overflow-hidden flex-shrink-0">
              {activity.featured_image ? (
                <img
                  src={activity.featured_image}
                  alt={activity.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={handleImageError}
                />
              ) : (
                <img
                  src={getActivityImage(activity.type)}
                  alt={activity.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">{activity.name}</p>
              <p className="text-sm text-neutral-500">{activity.duration}</p>
              <p className="text-xs text-neutral-400">
                {activity.user ? `Vendor: ${activity.user.company_name || activity.user.name}` : 'Admin-managed (no vendor)'}
              </p>
            </div>
          </div>
        </Td>
        <Td>
          <Badge tone={getDifficultyColor(activity.difficulty_level)}>
            {activity.type}
          </Badge>
        </Td>
        <Td className="!text-neutral-500">{activity.city}</Td>
        <Td className="font-semibold !text-primary-600">${activity.price}</Td>
        <Td>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={activity.status === 'active' ? 'success' : activity.status === 'inactive' ? 'danger' : 'warning'}>
              {activity.status}
            </Badge>
            {activity.is_featured && (
              <Badge tone="primary">Featured</Badge>
            )}
            <span
              title={activity.approval_status === 'rejected' && activity.rejection_reason ? activity.rejection_reason : undefined}
            >
              <Badge status={activity.approval_status || 'pending'}>
                {activity.approval_status || 'pending'}
              </Badge>
            </span>
          </div>
        </Td>
        <Td className="text-right">
          {user && ['admin', 'manager', 'super_admin'].includes(user.role) && (
            <div className="flex items-center justify-end gap-1">
              {activity.approval_status === 'pending' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onApprove(activity.id)}
                    title="Approve"
                    className="!p-2 !text-green-600 hover:!bg-green-50 hover:!text-green-700"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReject(activity)}
                    title="Reject"
                    className="!p-2 !text-red-600 hover:!bg-red-50 hover:!text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleFeatured(activity.id)}
                title="Toggle Featured"
                className={`!p-2 ${activity.is_featured ? '!text-amber-500' : '!text-neutral-400 hover:!text-amber-500'}`}
              >
                <Star className={`h-4 w-4 ${activity.is_featured ? 'fill-current' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(activity)}
                title="Edit"
                className="!p-2 !text-primary-600 hover:!bg-primary-50 hover:!text-primary-700"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLoginAsVendor(activity)}
                title="Login as Vendor"
                className="!p-2 !text-secondary-600 hover:!bg-secondary-50 hover:!text-secondary-700"
              >
                <LogIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(activity.id)}
                title="Delete"
                className="!p-2 !text-red-600 hover:!bg-red-50 hover:!text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Td>
      </tr>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison - only re-render if activity data actually changed
    return prevProps.activity.id === nextProps.activity.id &&
           prevProps.activity.featured_image === nextProps.activity.featured_image &&
           prevProps.activity.is_featured === nextProps.activity.is_featured &&
           prevProps.activity.status === nextProps.activity.status &&
           prevProps.activity.approval_status === nextProps.activity.approval_status &&
           prevProps.activity.rejection_reason === nextProps.activity.rejection_reason &&
           prevProps.activity.user_id === nextProps.activity.user_id;
  });

const AdminActivities = () => {
  const { user } = useAuthStore();
  const toast = useToast();
  const navigate = useNavigate();
  const { setActingVendor } = useActingVendorStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const vendorId = searchParams.get('vendor_id');
  const vendorName = searchParams.get('vendor_name');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Determine which API to use based on user role
  const isVendor = user?.role === 'vendor';
  const api = isVendor ? vendorAPI : adminAPI;
  const [editModal, setEditModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectingActivity, setRejectingActivity] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleImageSelect = useCallback((url) => {
    setFormData(prev => ({ ...prev, featured_image: url }));
    setMediaPickerOpen(false);
  }, []);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'other',
    location: '',
    city: '',
    price: '',
    duration: '',
    max_participants: '',
    difficulty_level: 'moderate',
    status: 'active',
    featured_image: '',
    user_id: '',
  });
  const [vendors, setVendors] = useState([]);

  const { pagination, applyResponse, goToPage, setPerPage, resetToFirstPage } = usePagination();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // A new search term always lands back on page 1 (a no-op if already there).
  useEffect(() => {
    resetToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getActivities({
        ...(vendorId ? { user_id: vendorId } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        page: pagination.current_page,
        per_page: pagination.per_page,
      });
      setActivities(response.data.data || []);
      applyResponse(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, vendorId, debouncedSearch]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    if (isVendor) return;
    // Populates a filter dropdown, not a browsable list — needs every
    // vendor, so per_page: 200 (the max page size) rather than paginating.
    adminAPI.getVendors({ per_page: 200 })
      .then((res) => setVendors(res.data.data || []))
      .catch((error) => console.error('Error fetching vendors:', error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginAsActivityOwner = useCallback((activity) => {
    if (!activity.user_id) {
      toast.error('This activity has no vendor account to log in as.');
      return;
    }
    setActingVendor(activity.user_id, activity.user?.company_name || activity.user?.name || activity.name);
    navigate('/vendor');
  }, [toast, setActingVendor, navigate]);

  const handleDelete = useCallback(async (id) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;
    try {
      await api.deleteActivity(id);
      setActivities((prev) => prev.filter((activity) => activity.id !== id));
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  }, []);

  const toggleFeatured = useCallback(async (id) => {
    try {
      const response = await api.toggleActivityFeatured(id);
      setActivities((prev) =>
        prev.map((activity) =>
          activity.id === id ? { ...activity, is_featured: response.data.activity.is_featured } : activity
        )
      );
    } catch (error) {
      console.error('Error toggling featured:', error);
    }
  }, []);

  const handleApprove = useCallback(async (id) => {
    try {
      await adminAPI.approveActivity(id, { status: 'approved' });
      setActivities((prev) =>
        prev.map((activity) => (activity.id === id ? { ...activity, approval_status: 'approved' } : activity))
      );
      toast.success('Activity approved successfully!');
    } catch (error) {
      console.error('Error approving activity:', error);
      toast.error('Failed to approve activity');
    }
  }, [toast]);

  const openRejectModal = useCallback((activity) => {
    setRejectingActivity(activity);
    setRejectReason('');
    setRejectModal(true);
  }, []);

  const closeRejectModal = () => {
    setRejectModal(false);
    setRejectingActivity(null);
    setRejectReason('');
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    try {
      await adminAPI.approveActivity(rejectingActivity.id, { status: 'rejected', rejection_reason: rejectReason });
      setActivities((prev) =>
        prev.map((activity) =>
          activity.id === rejectingActivity.id
            ? { ...activity, approval_status: 'rejected', rejection_reason: rejectReason }
            : activity
        )
      );
      toast.success('Activity rejected.');
      closeRejectModal();
    } catch (error) {
      console.error('Error rejecting activity:', error);
      toast.error('Failed to reject activity');
    }
  };

  const getDifficultyColor = useCallback((level) => {
    switch (level) {
      case 'easy': return 'success';
      case 'moderate': return 'warning';
      case 'challenging': return 'accent';
      case 'extreme': return 'danger';
      default: return 'neutral';
    }
  }, []);

  const emptyActivityForm = {
    name: '',
    description: '',
    type: 'other',
    location: '',
    city: '',
    price: '',
    duration: '',
    max_participants: '',
    difficulty_level: 'moderate',
    status: 'active',
    featured_image: '',
    user_id: '',
  };

  const openEditModal = useCallback((activity) => {
    setEditingActivity(activity);
    setFormData({
      name: activity.name,
      description: activity.description || '',
      type: activity.type,
      location: activity.location,
      city: activity.city,
      price: activity.price,
      duration: activity.duration,
      max_participants: activity.max_participants,
      difficulty_level: activity.difficulty_level,
      status: activity.status,
      featured_image: activity.featured_image || '',
      user_id: activity.user_id || '',
    });
    setEditModal(true);
  }, []);

  const handleAddActivity = () => {
    setEditingActivity(null);
    setFormData(emptyActivityForm);
    setEditModal(true);
  };

  const closeEditModal = () => {
    setEditModal(false);
    setEditingActivity(null);
    setFormData(emptyActivityForm);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const payload = { ...formData, user_id: formData.user_id || null };
    try {
      if (editingActivity) {
        await api.updateActivity(editingActivity.id, payload);
        setActivities(activities.map((a) => (a.id === editingActivity.id ? { ...a, ...payload } : a)));
        toast.success('Activity updated successfully!');
      } else {
        const response = await api.createActivity(payload);
        setActivities([response.data.activity, ...activities]);
        toast.success('Activity created successfully!');
      }
      closeEditModal();
    } catch (error) {
      console.error('Error saving activity:', error);
      toast.error('Failed to save activity');
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-neutral-900">Manage Activities</h2>
        {user && ['admin', 'manager', 'super_admin'].includes(user.role) && (
          <Button variant="primary" onClick={handleAddActivity}>
            <Plus className="h-5 w-5" />
            Add Activity
          </Button>
        )}
      </div>

      {vendorId && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <UserCog className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Viewing {vendorName || 'this vendor'}'s activities — superadmin oversight
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>
            Exit oversight view
          </Button>
        </div>
      )}

      <Input
        icon={Search}
        type="text"
        placeholder="Search activities..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <Table>
        <thead>
          <tr>
            <Th>Activity</Th>
            <Th>Type</Th>
            <Th>Location</Th>
            <Th>Price</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {activities.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              onToggleFeatured={toggleFeatured}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onApprove={handleApprove}
              onReject={openRejectModal}
              onLoginAsVendor={loginAsActivityOwner}
              getDifficultyColor={getDifficultyColor}
              getActivityImage={getActivityImage}
              user={user}
            />
          ))}
        </tbody>
      </Table>

      {pagination.total > 0 && (
        <Pagination
          pagination={pagination}
          onPageChange={goToPage}
          onPerPageChange={setPerPage}
          itemLabel="activities"
        />
      )}

      {/* Edit Modal */}
      <Modal open={editModal} onClose={closeEditModal} title={editingActivity ? 'Edit Activity' : 'Add New Activity'} size="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
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
              <option value="bungee">Bungee</option>
              <option value="paragliding">Paragliding</option>
              <option value="rafting">Rafting</option>
              <option value="trekking">Trekking</option>
              <option value="zipline">Zipline</option>
              <option value="skydiving">Skydiving</option>
              <option value="canyoning">Canyoning</option>
              <option value="rock_climbing">Rock Climbing</option>
              <option value="hot_air_balloon">Hot Air Balloon</option>
              <option value="other">Other</option>
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
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="seasonal">Seasonal</option>
          </Select>
          {!isVendor && (
            <Select
              label="Vendor Owner (optional)"
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
            >
              <option value="">No vendor — admin-managed listing</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.company_name || v.name}</option>
              ))}
            </Select>
          )}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Featured Image</label>
            <div className="flex gap-2">
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
                <ImageIcon className="h-4 w-4" />
                Select from Media Library
              </Button>
            </div>
            {formData.featured_image && (
              <div className="mt-2 relative">
                <img
                  src={formData.featured_image}
                  alt="Preview"
                  className="h-32 w-full object-cover rounded-xl"
                  onError={fallbackOnce(getActivityImage(formData.type))}
                />
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeEditModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal open={rejectModal} onClose={closeRejectModal} title="Reject Activity" size="sm">
        <form onSubmit={handleReject} className="space-y-4">
          <Textarea
            label="Rejection Reason"
            rows={3}
            required
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain why this activity is being rejected..."
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeRejectModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="danger" className="flex-1">
              Reject Activity
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

export default AdminActivities;
