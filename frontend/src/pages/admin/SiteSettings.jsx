import { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Globe,
  Image,
  Palette,
  Menu,
  Contact,
  Share2,
  Code,
  Plus,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Type,
  Check,
  Upload,
  Loader2,
  PanelBottom,
  Gift,
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import MediaPicker from '../../components/MediaPicker';
import { Button, Input, Textarea, Select } from '../../components/ui';

const GROUP_ICONS = {
  general: Globe,
  branding: Palette,
  navigation: Menu,
  contact: Contact,
  social: Share2,
  footer: PanelBottom,
  loyalty: Gift,
  advanced: Code,
};

const FIELD_TYPES = {
  text: { label: 'Text', component: 'input' },
  email: { label: 'Email', component: 'input' },
  url: { label: 'URL', component: 'input' },
  number: { label: 'Number', component: 'input' },
  textarea: { label: 'Text Area', component: 'textarea' },
  image: { label: 'Image URL', component: 'input' },
  color: { label: 'Color', component: 'color' },
  boolean: { label: 'Yes/No', component: 'checkbox' },
  menu: { label: 'Menu Items', component: 'menu' },
  json: { label: 'JSON', component: 'textarea' },
};

const SiteSettings = () => {
  const [settings, setSettings] = useState({});
  const [groups, setGroups] = useState({});
  const [defaults, setDefaults] = useState({});
  const [activeGroup, setActiveGroup] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [expandedMenus, setExpandedMenus] = useState({});
  const [newMenuItem, setNewMenuItem] = useState({ label: '', url: '', icon: '' });
  const [uploading, setUploading] = useState({});
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await adminAPI.getSiteSettings();
      setSettings(response.data.settings || {});
      setGroups(response.data.groups || {});
      setDefaults(response.data.defaults || {});
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage('Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaults = async () => {
    try {
      setLoading(true);
      await adminAPI.initializeSiteSettings();
      await fetchSettings();
      setMessage('Default settings initialized successfully');
    } catch (error) {
      console.error('Error initializing defaults:', error);
      setMessage('Error initializing defaults');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const settingsArray = Object.entries(settings).flatMap(([group, items]) =>
        items.map(item => ({
          key: item.key,
          value: item.value,
        }))
      );

      await adminAPI.bulkUpdateSiteSettings(settingsArray);
      setMessage('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const updateSettingValue = (group, key, value) => {
    setSettings(prev => ({
      ...prev,
      [group]: prev[group].map(item =>
        item.key === key ? { ...item, value } : item
      )
    }));
  };

  const addMenuItem = (group, key) => {
    const currentValue = settings[group]?.find(i => i.key === key)?.value || [];
    if (newMenuItem.label && newMenuItem.url) {
      updateSettingValue(group, key, [...currentValue, newMenuItem]);
      setNewMenuItem({ label: '', url: '', icon: '' });
    }
  };

  const removeMenuItem = (group, key, index) => {
    const currentValue = settings[group]?.find(i => i.key === key)?.value || [];
    const newValue = currentValue.filter((_, i) => i !== index);
    updateSettingValue(group, key, newValue);
  };

  const openMediaPicker = (group, key) => {
    setMediaPickerTarget({ group, key });
    setMediaPickerOpen(true);
  };

  const handleMediaSelect = (url) => {
    if (mediaPickerTarget) {
      updateSettingValue(mediaPickerTarget.group, mediaPickerTarget.key, url);
    }
    setMediaPickerOpen(false);
    setMediaPickerTarget(null);
  };

  const moveMenuItem = (group, key, index, direction) => {
    const currentValue = [...(settings[group]?.find(i => i.key === key)?.value || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < currentValue.length) {
      [currentValue[index], currentValue[newIndex]] = [currentValue[newIndex], currentValue[index]];
      updateSettingValue(group, key, currentValue);
    }
  };

  const renderField = (setting, group) => {
    const { key, value, type, label, description } = setting;

    switch (type) {
      case 'text':
      case 'email':
      case 'url':
      case 'number':
        return (
          <div>
            <Input
              label={label}
              type={type}
              value={value || ''}
              onChange={(e) => updateSettingValue(group, key, e.target.value)}
              placeholder={description}
            />
            <p className="text-xs text-neutral-500 mt-1.5">{description}</p>
          </div>
        );

      case 'textarea':
        return (
          <div>
            <Textarea
              label={label}
              value={value || ''}
              onChange={(e) => updateSettingValue(group, key, e.target.value)}
              rows={4}
              placeholder={description}
            />
            <p className="text-xs text-neutral-500 mt-1.5">{description}</p>
          </div>
        );

      case 'image':
        return (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex-1 w-full space-y-2">
                <Input
                  type="text"
                  value={value || ''}
                  onChange={(e) => updateSettingValue(group, key, e.target.value)}
                  placeholder="https://example.com/image.png or select from Media Library"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => openMediaPicker(group, key)}
                  >
                    <Image className="h-4 w-4" />
                    Select from Media Library
                  </Button>
                </div>
                <p className="text-xs text-neutral-500">{description}</p>
              </div>
              {value && (
                <div className="relative shrink-0">
                  <img
                    src={value}
                    alt={label}
                    className="h-20 w-20 object-cover rounded-xl border border-neutral-200"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                  <button
                    onClick={() => updateSettingValue(group, key, '')}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'color':
        return (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={value || '#000000'}
                onChange={(e) => updateSettingValue(group, key, e.target.value)}
                className="h-11 w-20 rounded-lg cursor-pointer border border-neutral-300"
              />
              <Input
                type="text"
                value={value || ''}
                onChange={(e) => updateSettingValue(group, key, e.target.value)}
                className="flex-1"
                placeholder="#4f46e5"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1.5">{description}</p>
          </div>
        );

      case 'boolean':
        return (
          <label className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100 cursor-pointer">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => updateSettingValue(group, key, e.target.checked)}
              className="h-4 w-4 mt-0.5 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
            />
            <span>
              <span className="block text-sm font-medium text-neutral-700">{label}</span>
              {description && <span className="block text-xs text-neutral-500 mt-0.5">{description}</span>}
            </span>
          </label>
        );

      case 'menu':
        const menuItems = value || [];
        return (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">{label}</label>
            <div className="bg-neutral-50 rounded-xl p-4">
              {menuItems.length === 0 ? (
                <p className="text-sm text-neutral-500 mb-4">No menu items</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {menuItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white p-3 rounded-xl border border-neutral-200">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-neutral-900 truncate">{item.label}</p>
                        <p className="text-xs text-neutral-500 truncate">{item.url}</p>
                        {item.icon && <p className="text-xs text-neutral-400">Icon: {item.icon}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => moveMenuItem(group, key, index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-neutral-500 hover:bg-neutral-100 rounded disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => moveMenuItem(group, key, index, 'down')}
                          disabled={index === menuItems.length - 1}
                          className="p-1 text-neutral-500 hover:bg-neutral-100 rounded disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeMenuItem(group, key, index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Menu Item */}
              <div className="bg-white p-3 rounded-xl border border-dashed border-neutral-300">
                <p className="text-sm font-medium text-neutral-700 mb-2">Add Menu Item</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    type="text"
                    value={newMenuItem.label}
                    onChange={(e) => setNewMenuItem(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Label"
                  />
                  <Input
                    type="text"
                    value={newMenuItem.url}
                    onChange={(e) => setNewMenuItem(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="URL (/hotels)"
                  />
                  <Input
                    type="text"
                    value={newMenuItem.icon}
                    onChange={(e) => setNewMenuItem(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="Icon (optional)"
                  />
                </div>
                <button
                  onClick={() => addMenuItem(group, key)}
                  className="mt-2 flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </button>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-1.5">{description}</p>
          </div>
        );

      default:
        return null;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary-600" />
          Site Settings
        </h2>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={initializeDefaults}>
            <RefreshCw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button type="button" variant="primary" loading={saving} onClick={handleSave}>
            {!saving && <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-sm font-medium ${message.includes('Error') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {message.includes('Error') ? <AlertCircle className="h-5 w-5 shrink-0" /> : <Check className="h-5 w-5 shrink-0" />}
          {message}
        </div>
      )}

      {/* Group Tabs */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(groups).map(([key, label]) => {
          const Icon = GROUP_ICONS[key] || Settings;
          return (
            <button
              key={key}
              onClick={() => setActiveGroup(key)}
              className={`flex items-center px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                activeGroup === key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-2xl shadow-card p-4 sm:p-6">
        <h3 className="font-display text-xl font-semibold text-neutral-900 mb-6 flex items-center gap-2">
          {(() => {
            const Icon = GROUP_ICONS[activeGroup] || Settings;
            return <Icon className="h-5 w-5 text-primary-600" />;
          })()}
          {groups[activeGroup]}
        </h3>

        <div className="space-y-6">
          {(settings[activeGroup] || []).map((setting) => (
            <div key={setting.key} className="border-b border-neutral-100 pb-6 last:border-0 last:pb-0">
              {renderField(setting, activeGroup)}
            </div>
          ))}

          {(!settings[activeGroup] || settings[activeGroup].length === 0) && (
            <div className="text-center py-8 text-neutral-500">
              <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No settings in this group</p>
              <button
                onClick={initializeDefaults}
                className="mt-4 text-primary-600 hover:underline font-medium"
              >
                Initialize default settings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-primary-800 mb-2">About Site Settings</h3>
        <ul className="text-sm text-primary-700 space-y-1">
          <li>• Changes are applied immediately after saving</li>
          <li>• Menu items can be reordered using the up/down arrows</li>
          <li>• Images should be valid URLs (use Upload feature for local images)</li>
          <li>• Reset to Defaults will restore all original settings</li>
        </ul>
      </div>
      <MediaPicker
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
};

export default SiteSettings;
