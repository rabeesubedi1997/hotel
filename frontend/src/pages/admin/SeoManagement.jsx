import { useState, useEffect } from 'react';
import { Save, Globe, Search, FileText, Image, Link2, AlertCircle, X } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { Button, Input, Textarea, Select } from '../../components/ui';

const PREDEFINED_PAGES = {
  'home': 'Home Page',
  'hotels': 'Hotels List',
  'activities': 'Activities List',
  'login': 'Login',
  'register': 'Register',
  'contact': 'Contact',
  'about': 'About Us',
  'checkout': 'Checkout',
  'bookings': 'Bookings',
  'profile': 'Profile',
};

const SeoManagement = () => {
  const [settings, setSettings] = useState([]);
  const [selectedPage, setSelectedPage] = useState('home');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    keywords: '',
    og_image: '',
    canonical: '',
    noindex: false,
    json_ld: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    loadPageSettings(selectedPage);
  }, [selectedPage, settings]);

  const fetchSettings = async () => {
    try {
      const response = await adminAPI.getSeoSettings();
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching SEO settings:', error);
    }
  };

  const loadPageSettings = (page) => {
    const setting = settings.find(s => s.page === page);
    if (setting) {
      setFormData({
        title: setting.title || '',
        description: setting.description || '',
        keywords: setting.keywords || '',
        og_image: setting.og_image || '',
        canonical: setting.canonical || '',
        noindex: setting.noindex || false,
        json_ld: setting.json_ld ? JSON.stringify(setting.json_ld, null, 2) : '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        keywords: '',
        og_image: '',
        canonical: '',
        noindex: false,
        json_ld: '',
      });
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const data = {
        ...formData,
        json_ld: formData.json_ld ? JSON.parse(formData.json_ld) : null,
      };

      await adminAPI.updateSeoSetting(selectedPage, data);
      setMessage('SEO settings saved successfully');
      fetchSettings();
    } catch (error) {
      console.error('Error saving SEO settings:', error);
      setMessage('Error saving SEO settings');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const getCharacterCount = (text, max) => {
    const count = text?.length || 0;
    const color = count > max ? 'text-red-500' : count > max * 0.9 ? 'text-amber-500' : 'text-green-600';
    return <span className={`text-xs font-normal ${color}`}>{count}/{max}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary-600" />
          SEO Management
        </h2>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-sm font-medium ${message.includes('Error') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {message.includes('Error') ? <AlertCircle className="h-5 w-5 shrink-0" /> : <Save className="h-5 w-5 shrink-0" />}
          {message}
        </div>
      )}

      {/* Page Selector */}
      <div className="bg-white rounded-2xl shadow-card p-4 sm:p-6">
        <Select
          label={
            <span className="inline-flex items-center gap-1.5">
              <Search className="h-4 w-4" />
              Select Page
            </span>
          }
          value={selectedPage}
          onChange={(e) => setSelectedPage(e.target.value)}
        >
          {Object.entries(PREDEFINED_PAGES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
      </div>

      {/* SEO Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-4 sm:p-6">
        <div className="space-y-6">
          {/* Title */}
          <div>
            <Input
              label={
                <span className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    Page Title
                  </span>
                  {getCharacterCount(formData.title, 60)}
                </span>
              }
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter page title (recommended: 50-60 characters)"
            />
            <p className="text-xs text-neutral-500 mt-1.5">This appears in browser tabs and search results</p>
          </div>

          {/* Description */}
          <div>
            <Textarea
              label={
                <span className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    Meta Description
                  </span>
                  {getCharacterCount(formData.description, 160)}
                </span>
              }
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Enter meta description (recommended: 150-160 characters)"
            />
            <p className="text-xs text-neutral-500 mt-1.5">This appears under your page title in search results</p>
          </div>

          {/* Keywords */}
          <div>
            <Input
              label={
                <span className="inline-flex items-center gap-1.5">
                  <Search className="h-4 w-4" />
                  Keywords
                </span>
              }
              type="text"
              name="keywords"
              value={formData.keywords}
              onChange={handleChange}
              placeholder="Enter keywords separated by commas"
            />
            <p className="text-xs text-neutral-500 mt-1.5">Example: Nepal hotels, Kathmandu, luxury accommodation</p>
          </div>

          {/* OG Image */}
          <div>
            <Input
              label={
                <span className="inline-flex items-center gap-1.5">
                  <Image className="h-4 w-4" />
                  Open Graph Image URL
                </span>
              }
              type="text"
              name="og_image"
              value={formData.og_image}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-neutral-500 mt-1.5">Image displayed when shared on social media (1200x630px recommended)</p>
          </div>

          {/* Canonical URL */}
          <div>
            <Input
              label={
                <span className="inline-flex items-center gap-1.5">
                  <Link2 className="h-4 w-4" />
                  Canonical URL
                </span>
              }
              type="text"
              name="canonical"
              value={formData.canonical}
              onChange={handleChange}
              placeholder={`/${selectedPage}`}
            />
            <p className="text-xs text-neutral-500 mt-1.5">The preferred URL for this page (helps prevent duplicate content)</p>
          </div>

          {/* No Index */}
          <label className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100 cursor-pointer">
            <input
              type="checkbox"
              name="noindex"
              checked={formData.noindex}
              onChange={handleChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
            />
            <span className="text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5">
              <X className="h-4 w-4 text-red-500" />
              Hide from search engines (noindex)
            </span>
          </label>

          {/* JSON-LD */}
          <div>
            <Textarea
              label={
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  Structured Data (JSON-LD)
                </span>
              }
              name="json_ld"
              value={formData.json_ld}
              onChange={handleChange}
              rows="6"
              placeholder="Enter JSON-LD structured data"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
            />
            <p className="text-xs text-neutral-500 mt-1.5">
              Structured data helps search engines understand your content.
              <a href="https://schema.org" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline ml-1">
                Learn more about Schema.org
              </a>
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <Button type="submit" loading={loading} size="lg">
            {!loading && <Save className="h-5 w-5" />}
            Save SEO Settings
          </Button>
        </div>
      </form>

      {/* SEO Tips */}
      <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-primary-800 mb-2">SEO Best Practices</h3>
        <ul className="text-sm text-primary-700 space-y-1">
          <li>• Keep titles under 60 characters for optimal display in search results</li>
          <li>• Write compelling meta descriptions (150-160 characters) to improve click-through rates</li>
          <li>• Use relevant keywords naturally in your content</li>
          <li>• Include structured data to enhance search result snippets</li>
          <li>• Ensure all pages have unique titles and descriptions</li>
        </ul>
      </div>
    </div>
  );
};

export default SeoManagement;
