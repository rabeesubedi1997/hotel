import { useCallback, useEffect, useRef, useState } from 'react';
import { Megaphone, Plus, Edit2, Trash2, Eye, EyeOff, MousePointerClick, Image as ImageIcon, Check } from 'lucide-react';
import { adminAPI } from '../../services/api';
import MediaPicker from '../../components/MediaPicker';
import { Button, Input, Textarea, Select, Card, Badge, StatCard, Modal } from '../../components/ui';

const PLACEMENTS = [
  { value: 'home_hero', label: 'Home — Top announcement bar' },
  { value: 'home_strip', label: 'Home — Promo strip (below hero)' },
  { value: 'listing_sidebar', label: 'Hotels/Activities listing pages' },
];

const placementLabel = (value) => PLACEMENTS.find((p) => p.value === value)?.label || value;

const defaultForm = {
  title: '',
  subtitle: '',
  image: '',
  cta_text: '',
  cta_link: '',
  placement: 'home_strip',
  is_active: true,
  starts_at: '',
  ends_at: '',
  display_order: 0,
};

// Datetime-local inputs need "YYYY-MM-DDTHH:mm"; the API returns/accepts
// ISO strings, so trim to the format <input type="datetime-local"> expects.
const toInputDateTime = (value) => (value ? value.slice(0, 16).replace(' ', 'T') : '');

const PromotionsManagement = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [message, setMessage] = useState('');
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchPromotions();
  }, []);

  const fetchPromotions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPromotions();
      setPromotions(response.data || []);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      setMessage('Error loading promotions');
    } finally {
      setLoading(false);
    }
  }, []);

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      starts_at: formData.starts_at || null,
      ends_at: formData.ends_at || null,
    };

    try {
      if (editing) {
        await adminAPI.updatePromotion(editing.id, payload);
        showMessage('Promotion updated successfully');
      } else {
        await adminAPI.createPromotion(payload);
        showMessage('Promotion created successfully');
      }
      setShowModal(false);
      setEditing(null);
      setFormData(defaultForm);
      fetchPromotions();
    } catch (error) {
      console.error('Error saving promotion:', error);
      showMessage(error.response?.data?.message || 'Error saving promotion');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this promotion? This cannot be undone.')) return;
    try {
      await adminAPI.deletePromotion(id);
      showMessage('Promotion deleted');
      fetchPromotions();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      showMessage('Error deleting promotion');
    }
  };

  const toggleActive = async (promo) => {
    try {
      await adminAPI.togglePromotionActive(promo.id);
      setPromotions((prev) => prev.map((p) => (p.id === promo.id ? { ...p, is_active: !p.is_active } : p)));
    } catch (error) {
      console.error('Error toggling promotion:', error);
      showMessage('Error updating promotion status');
    }
  };

  const openEditModal = (promo) => {
    setEditing(promo);
    setFormData({
      ...defaultForm,
      ...promo,
      starts_at: toInputDateTime(promo.starts_at),
      ends_at: toInputDateTime(promo.ends_at),
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditing(null);
    setFormData(defaultForm);
    setShowModal(true);
  };

  const activeCount = promotions.filter((p) => p.is_active).length;
  const totalClicks = promotions.reduce((sum, p) => sum + (p.click_count || 0), 0);

  if (loading && promotions.length === 0) {
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
          <Megaphone className="h-6 w-6 mr-2 text-primary-600" />
          Promotions & Advertising
        </h2>
        <Button type="button" variant="primary" onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          New Promotion
        </Button>
      </div>

      {message && (
        <div className="p-4 rounded-2xl flex items-center text-sm font-medium bg-green-100 text-green-700">
          <Check className="h-5 w-5 mr-2 flex-shrink-0" />
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard icon={Megaphone} title="Total Promotions" value={promotions.length} tone="primary" />
        <StatCard icon={Eye} title="Currently Active" value={activeCount} tone="accent" />
        <StatCard icon={MousePointerClick} title="Total Clicks" value={totalClicks} tone="neutral" />
      </div>

      {promotions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card text-center py-12">
          <Megaphone className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
          <p className="text-neutral-500">No promotions yet. Create one to advertise on the homepage or listing pages.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map((promo) => (
            <Card key={promo.id} className="flex flex-col">
              <div className="relative h-32 bg-neutral-900">
                {promo.image ? (
                  <img src={promo.image} alt={promo.title} className="w-full h-full object-cover opacity-70" />
                ) : null}
                <div className="absolute inset-0 flex items-center px-4">
                  <p className="text-white font-display font-semibold text-lg leading-snug line-clamp-2">{promo.title}</p>
                </div>
                <div className="absolute top-3 right-3">
                  {promo.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <Badge tone="primary" className="self-start mb-2">{placementLabel(promo.placement)}</Badge>
                {promo.subtitle && <p className="text-sm text-neutral-600 mb-2 line-clamp-2">{promo.subtitle}</p>}
                <div className="mt-auto pt-3 flex items-center justify-between text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <MousePointerClick className="h-3.5 w-3.5" />
                    {promo.click_count || 0} clicks
                  </span>
                  <span>Order {promo.display_order}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-neutral-100 flex gap-2">
                  <Button type="button" variant="secondary" size="sm" fullWidth onClick={() => openEditModal(promo)}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => toggleActive(promo)} title={promo.is_active ? 'Deactivate' : 'Activate'}>
                    {promo.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={() => handleDelete(promo.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Promotion' : 'New Promotion'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Image</label>
            <div className="flex items-center gap-4">
              <div className="w-28 h-20 bg-neutral-200 rounded-xl overflow-hidden flex-shrink-0">
                {formData.image ? (
                  <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-100">
                    <ImageIcon className="h-6 w-6 text-primary-300" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <Input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                  placeholder="Image URL or select from Media Library"
                  className="mb-2"
                />
                <Button type="button" variant="secondary" size="sm" onClick={() => setMediaPickerOpen(true)}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Select from Media Library
                </Button>
              </div>
            </div>
          </div>

          <Input
            label="Title *"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            required
          />

          <Textarea
            label="Subtitle"
            value={formData.subtitle || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
            rows={2}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="CTA Button Text"
              type="text"
              value={formData.cta_text || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, cta_text: e.target.value }))}
              placeholder="Explore Deals"
            />
            <Input
              label="CTA Link"
              type="text"
              value={formData.cta_link || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, cta_link: e.target.value }))}
              placeholder="/hotels or https://..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Placement *"
              value={formData.placement}
              onChange={(e) => setFormData((prev) => ({ ...prev, placement: e.target.value }))}
              required
            >
              {PLACEMENTS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </Select>
            <Input
              label="Display Order"
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData((prev) => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Starts At (optional)"
              type="datetime-local"
              value={formData.starts_at || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, starts_at: e.target.value }))}
            />
            <Input
              label="Ends At (optional)"
              type="datetime-local"
              value={formData.ends_at || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, ends_at: e.target.value }))}
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
              {editing ? 'Update Promotion' : 'Create Promotion'}
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <MediaPicker
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => { setFormData((prev) => ({ ...prev, image: url })); setMediaPickerOpen(false); }}
      />
    </div>
  );
};

export default PromotionsManagement;
