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
  Upload
} from 'lucide-react';
import { adminAPI } from '../../services/api';

const GROUP_ICONS = {
  general: Globe,
  branding: Palette,
  navigation: Menu,
  contact: Contact,
  social: Share2,
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
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type={type}
              value={value || ''}
              onChange={(e) => updateSettingValue(group, key, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder={description}
            />
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
        );

      case 'textarea':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <textarea
              value={value || ''}
              onChange={(e) => updateSettingValue(group, key, e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder={description}
            />
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
        );

      case 'image':
        const handleImageUpload = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          setUploading(prev => ({ ...prev, [key]: true }));
          
          try {
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await adminAPI.uploadImage(formData);
            updateSettingValue(group, key, response.data.url);
            setMessage('Image uploaded successfully');
          } catch (error) {
            console.error('Error uploading image:', error);
            setMessage('Error uploading image');
          } finally {
            setUploading(prev => ({ ...prev, [key]: false }));
            setTimeout(() => setMessage(''), 3000);
          }
        };
        
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="flex gap-4 items-start">
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={value || ''}
                  onChange={(e) => updateSettingValue(group, key, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="https://example.com/image.png or upload below"
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer text-sm">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading[key] ? 'Uploading...' : 'Choose File'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading[key]}
                    />
                  </label>
                  <span className="text-xs text-gray-500">Max 2MB (jpg, png, gif)</span>
                </div>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
              {value && (
                <div className="relative">
                  <img 
                    src={value} 
                    alt={label}
                    className="h-20 w-20 object-cover rounded-lg border"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={value || '#000000'}
                onChange={(e) => updateSettingValue(group, key, e.target.value)}
                className="h-10 w-20 rounded cursor-pointer"
              />
              <input
                type="text"
                value={value || ''}
                onChange={(e) => updateSettingValue(group, key, e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="#4f46e5"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => updateSettingValue(group, key, e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm font-medium text-gray-700">{label}</label>
            <p className="ml-4 text-xs text-gray-500">{description}</p>
          </div>
        );

      case 'menu':
        const menuItems = value || [];
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="bg-gray-50 rounded-lg p-4">
              {menuItems.length === 0 ? (
                <p className="text-sm text-gray-500 mb-4">No menu items</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {menuItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white p-3 rounded-lg border">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.url}</p>
                        {item.icon && <p className="text-xs text-gray-400">Icon: {item.icon}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveMenuItem(group, key, index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => moveMenuItem(group, key, index, 'down')}
                          disabled={index === menuItems.length - 1}
                          className="p-1 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30"
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
              <div className="bg-white p-3 rounded-lg border border-dashed">
                <p className="text-sm font-medium mb-2">Add Menu Item</p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newMenuItem.label}
                    onChange={(e) => setNewMenuItem(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Label"
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={newMenuItem.url}
                    onChange={(e) => setNewMenuItem(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="URL (/hotels)"
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={newMenuItem.icon}
                    onChange={(e) => setNewMenuItem(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="Icon (optional)"
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <button
                  onClick={() => addMenuItem(group, key)}
                  className="mt-2 flex items-center text-sm text-primary-600 hover:text-primary-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Settings className="h-6 w-6 mr-2" />
          Site Settings
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={initializeDefaults}
            className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.includes('Error') ? <AlertCircle className="h-5 w-5 mr-2" /> : <Check className="h-5 w-5 mr-2" />}
          {message}
        </div>
      )}

      {/* Group Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(groups).map(([key, label]) => {
          const Icon = GROUP_ICONS[key] || Settings;
          return (
            <button
              key={key}
              onClick={() => setActiveGroup(key)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                activeGroup === key
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          {(() => {
            const Icon = GROUP_ICONS[activeGroup] || Settings;
            return <Icon className="h-5 w-5 mr-2" />;
          })()}
          {groups[activeGroup]}
        </h2>

        <div className="space-y-6">
          {(settings[activeGroup] || []).map((setting) => (
            <div key={setting.key} className="border-b border-gray-200 pb-6 last:border-0">
              {renderField(setting, activeGroup)}
            </div>
          ))}

          {(!settings[activeGroup] || settings[activeGroup].length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No settings in this group</p>
              <button
                onClick={initializeDefaults}
                className="mt-4 text-primary-600 hover:underline"
              >
                Initialize default settings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">About Site Settings</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Changes are applied immediately after saving</li>
          <li>• Menu items can be reordered using the up/down arrows</li>
          <li>• Images should be valid URLs (use Upload feature for local images)</li>
          <li>• Reset to Defaults will restore all original settings</li>
        </ul>
      </div>
    </div>
  );
};

export default SiteSettings;
