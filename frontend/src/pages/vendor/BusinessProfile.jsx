import { useState, useEffect } from 'react';
import { Image as ImageIcon, Save, Loader2 } from 'lucide-react';
import { vendorAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Textarea, Card } from '../../components/ui';
import MediaPicker from '../../components/MediaPicker';

const emptyForm = {
  company_name: '',
  bio: '',
  avatar: '',
  cover_image: '',
  phone: '',
  address: '',
  city: '',
};

/**
 * A vendor's own public storefront profile (see VendorProfile.jsx /
 * /vendors/{slug}) — company_name/bio/avatar/cover_image existed on User
 * already but had no self-service editing page; only Admin\VendorController
 * could touch company_name.
 */
const VendorBusinessProfile = () => {
  const toast = useToast();
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);

  useEffect(() => {
    vendorAPI.getProfile()
      .then((res) => {
        const v = res.data;
        setFormData({
          company_name: v.company_name || '',
          bio: v.bio || '',
          avatar: v.avatar || '',
          cover_image: v.cover_image || '',
          phone: v.phone || '',
          address: v.address || '',
          city: v.city || '',
        });
      })
      .catch((err) => {
        console.error('Error fetching business profile', err);
        toast.error('Failed to load business profile');
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const openPicker = (field) => {
    setPickerTarget(field);
    setPickerOpen(true);
  };

  const handlePickerSelect = (url) => {
    if (pickerTarget) setFormData((prev) => ({ ...prev, [pickerTarget]: url }));
    setPickerOpen(false);
    setPickerTarget(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await vendorAPI.updateProfile(formData);
      toast.success('Business profile updated successfully!');
    } catch (error) {
      console.error('Error saving business profile', error);
      toast.error(error.response?.data?.message || 'Failed to save business profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const imageField = (label, field) => (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="flex-1 w-full space-y-2">
          <Input
            type="text"
            value={formData[field]}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
            placeholder="https://example.com/image.jpg or select from Media Library"
          />
          <Button type="button" variant="secondary" size="sm" onClick={() => openPicker(field)}>
            <ImageIcon className="h-4 w-4" />
            Select from Media Library
          </Button>
        </div>
        {formData[field] && (
          <img
            src={formData[field]}
            alt={label}
            className="h-20 w-20 object-cover rounded-xl border border-neutral-200 shrink-0"
            onError={(e) => (e.target.style.display = 'none')}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-neutral-900 mb-1">Business Profile</h1>
      <p className="text-sm text-neutral-500 mb-6">
        This is what customers see on your public storefront page.
      </p>

      <Card hoverLift={false} className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Company Name"
            type="text"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
          />
          <Textarea
            label="Bio"
            rows={4}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell customers about your business..."
          />
          {imageField('Avatar / Logo', 'avatar')}
          {imageField('Cover Image', 'cover_image')}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="City"
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
          <Input
            label="Address"
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <Button type="submit" variant="primary" loading={saving}>
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </form>
      </Card>

      <MediaPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
      />
    </div>
  );
};

export default VendorBusinessProfile;
