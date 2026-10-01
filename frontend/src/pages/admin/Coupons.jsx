import { useCallback, useEffect, useState } from 'react';
import { Tag, Plus, Edit2, Trash2, Eye, EyeOff, Check } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { Button, Input, Textarea, Select, Card, Badge, StatCard, Modal, Pagination } from '../../components/ui';
import usePagination from '../../hooks/usePagination';

const APPLICABLE_TO = [
  { value: 'all', label: 'Everything' },
  { value: 'hotels', label: 'Hotels only' },
  { value: 'activities', label: 'Activities only' },
  { value: 'packages', label: 'Packages only' },
  { value: 'tour_guides', label: 'Tour guides only' },
];

const defaultForm = {
  code: '',
  description: '',
  type: 'flat',
  value: '',
  max_discount_amount: '',
  min_order_amount: '',
  applicable_to: 'all',
  usage_limit: '',
  usage_limit_per_user: 1,
  valid_from: '',
  valid_until: '',
  is_active: true,
};

const toInputDateTime = (value) => (value ? value.slice(0, 16).replace(' ', 'T') : '');

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [message, setMessage] = useState('');
  const { pagination, applyResponse, goToPage, setPerPage } = usePagination();

  const fetchCoupons = useCallback(async (page, perPage) => {
    try {
      setLoading(true);
      const response = await adminAPI.getCoupons({ page, per_page: perPage });
      setCoupons(response.data?.data || []);
      applyResponse(response.data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      setMessage('Error loading coupons');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCoupons(pagination.current_page, pagination.per_page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page]);

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      code: formData.code.toUpperCase(),
      max_discount_amount: formData.max_discount_amount || null,
      min_order_amount: formData.min_order_amount || 0,
      usage_limit: formData.usage_limit || null,
      valid_from: formData.valid_from || null,
      valid_until: formData.valid_until || null,
    };

    try {
      if (editing) {
        await adminAPI.updateCoupon(editing.id, payload);
        showMessage('Coupon updated successfully');
      } else {
        await adminAPI.createCoupon(payload);
        showMessage('Coupon created successfully');
      }
      setShowModal(false);
      setEditing(null);
      setFormData(defaultForm);
      fetchCoupons(pagination.current_page, pagination.per_page);
    } catch (error) {
      console.error('Error saving coupon:', error);
      showMessage(error.response?.data?.message || 'Error saving coupon');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this coupon? This cannot be undone.')) return;
    try {
      await adminAPI.deleteCoupon(id);
      showMessage('Coupon deleted');
      fetchCoupons(pagination.current_page, pagination.per_page);
    } catch (error) {
      console.error('Error deleting coupon:', error);
      showMessage('Error deleting coupon');
    }
  };

  const toggleActive = async (coupon) => {
    try {
      await adminAPI.toggleCouponActive(coupon.id);
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, is_active: !c.is_active } : c)));
    } catch (error) {
      console.error('Error toggling coupon:', error);
      showMessage('Error updating coupon status');
    }
  };

  const openEditModal = (coupon) => {
    setEditing(coupon);
    setFormData({
      ...defaultForm,
      ...coupon,
      valid_from: toInputDateTime(coupon.valid_from),
      valid_until: toInputDateTime(coupon.valid_until),
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditing(null);
    setFormData(defaultForm);
    setShowModal(true);
  };

  const activeCount = coupons.filter((c) => c.is_active).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.redemptions_count || 0), 0);

  if (loading && coupons.length === 0) {
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
          <Tag className="h-6 w-6 mr-2 text-primary-600" />
          Coupons & Promo Codes
        </h2>
        <Button type="button" variant="primary" onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          New Coupon
        </Button>
      </div>

      {message && (
        <div className="p-4 rounded-2xl flex items-center text-sm font-medium bg-green-100 text-green-700">
          <Check className="h-5 w-5 mr-2 flex-shrink-0" />
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard icon={Tag} title="Total Coupons" value={coupons.length} tone="primary" />
        <StatCard icon={Eye} title="Currently Active" value={activeCount} tone="accent" />
        <StatCard icon={Check} title="Total Redemptions" value={totalRedemptions} tone="neutral" />
      </div>

      {coupons.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card text-center py-12">
          <Tag className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
          <p className="text-neutral-500">No coupons yet. Create one to offer discounts at checkout.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((coupon) => (
            <Card key={coupon.id} className="flex flex-col">
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono font-bold text-lg tracking-wide text-neutral-900">{coupon.code}</span>
                  {coupon.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}
                </div>
                {coupon.description && <p className="text-sm text-neutral-600 mb-3">{coupon.description}</p>}
                <p className="text-2xl font-bold text-primary-600 mb-1">
                  {coupon.type === 'percent' ? `${coupon.value}% off` : `$${coupon.value} off`}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge tone="info">{APPLICABLE_TO.find((a) => a.value === coupon.applicable_to)?.label || coupon.applicable_to}</Badge>
                  {Number(coupon.min_order_amount) > 0 && (
                    <Badge tone="neutral">Min ${coupon.min_order_amount}</Badge>
                  )}
                </div>
                <div className="mt-auto pt-3 flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-100">
                  <span>{coupon.redemptions_count || 0} redeemed{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}</span>
                  {coupon.valid_until && <span>Expires {new Date(coupon.valid_until).toLocaleDateString()}</span>}
                </div>
                <div className="mt-4 pt-4 border-t border-neutral-100 flex gap-2">
                  <Button type="button" variant="secondary" size="sm" fullWidth onClick={() => openEditModal(coupon)}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => toggleActive(coupon)} title={coupon.is_active ? 'Deactivate' : 'Activate'}>
                    {coupon.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={() => handleDelete(coupon.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {pagination.total > 0 && (
        <Pagination pagination={pagination} onPageChange={goToPage} onPerPageChange={setPerPage} itemLabel="coupons" />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Coupon' : 'New Coupon'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Coupon Code *"
            type="text"
            value={formData.code}
            onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
            placeholder="WELCOME10"
            required
          />

          <Textarea
            label="Description"
            value={formData.description || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={2}
            placeholder="10% off first booking"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Discount Type *"
              value={formData.type}
              onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
              required
            >
              <option value="flat">Flat amount ($)</option>
              <option value="percent">Percentage (%)</option>
            </Select>
            <Input
              label={formData.type === 'percent' ? 'Percent Off *' : 'Amount Off ($) *'}
              type="number"
              min="0"
              step="0.01"
              value={formData.value}
              onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
              required
            />
          </div>

          {formData.type === 'percent' && (
            <Input
              label="Max Discount Cap ($, optional)"
              type="number"
              min="0"
              step="0.01"
              value={formData.max_discount_amount || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, max_discount_amount: e.target.value }))}
              placeholder="No cap"
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Minimum Order Amount ($)"
              type="number"
              min="0"
              step="0.01"
              value={formData.min_order_amount || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, min_order_amount: e.target.value }))}
            />
            <Select
              label="Applies To"
              value={formData.applicable_to}
              onChange={(e) => setFormData((prev) => ({ ...prev, applicable_to: e.target.value }))}
            >
              {APPLICABLE_TO.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Total Usage Limit (optional)"
              type="number"
              min="1"
              value={formData.usage_limit || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, usage_limit: e.target.value }))}
              placeholder="Unlimited"
            />
            <Input
              label="Usage Limit Per User"
              type="number"
              min="1"
              value={formData.usage_limit_per_user}
              onChange={(e) => setFormData((prev) => ({ ...prev, usage_limit_per_user: parseInt(e.target.value) || 1 }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Valid From (optional)"
              type="datetime-local"
              value={formData.valid_from || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, valid_from: e.target.value }))}
            />
            <Input
              label="Valid Until (optional)"
              type="datetime-local"
              value={formData.valid_until || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, valid_until: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
            />
            Active
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="submit" fullWidth>
              {editing ? 'Update Coupon' : 'Create Coupon'}
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Coupons;
