import { useState, useEffect } from 'react';
import { Save, Globe, Search, FileText, Image, Link2, AlertCircle, X } from 'lucide-react';
import { adminAPI } from '../../services/api';

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
    const color = count > max ? 'text-red-500' : count > max * 0.9 ? 'text-yellow-500' : 'text-green-500';
    return <span className={`text-sm ${color}`}>{count}/{max}</span>;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Globe className="h-6 w-6 mr-2" />
          SEO Management
        </h1>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.includes('Error') ? <AlertCircle className="h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />}
          {message}
        </div>
      )}

      {/* Page Selector */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Search className="inline h-4 w-4 mr-1" />
          Select Page
        </label>
        <select
          value={selectedPage}
          onChange={(e) => setSelectedPage(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          {Object.entries(PREDEFINED_PAGES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* SEO Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline h-4 w-4 mr-1" />
              Page Title {getCharacterCount(formData.title, 60)}
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter page title (recommended: 50-60 characters)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">This appears in browser tabs and search results</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline h-4 w-4 mr-1" />
              Meta Description {getCharacterCount(formData.description, 160)}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Enter meta description (recommended: 150-160 characters)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">This appears under your page title in search results</p>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="inline h-4 w-4 mr-1" />
              Keywords
            </label>
            <input
              type="text"
              name="keywords"
              value={formData.keywords}
              onChange={handleChange}
              placeholder="Enter keywords separated by commas"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Example: Nepal hotels, Kathmandu, luxury accommodation</p>
          </div>

          {/* OG Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Image className="inline h-4 w-4 mr-1" />
              Open Graph Image URL
            </label>
            <input
              type="text"
              name="og_image"
              value={formData.og_image}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Image displayed when shared on social media (1200x630px recommended)</p>
          </div>

          {/* Canonical URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Link2 className="inline h-4 w-4 mr-1" />
              Canonical URL
            </label>
            <input
              type="text"
              name="canonical"
              value={formData.canonical}
              onChange={handleChange}
              placeholder={`/${selectedPage}`}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">The preferred URL for this page (helps prevent duplicate content)</p>
          </div>

          {/* No Index */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="noindex"
              checked={formData.noindex}
              onChange={handleChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm font-medium text-gray-700">
              <X className="inline h-4 w-4 mr-1 text-red-500" />
              Hide from search engines (noindex)
            </label>
          </div>

          {/* JSON-LD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline h-4 w-4 mr-1" />
              Structured Data (JSON-LD)
            </label>
            <textarea
              name="json_ld"
              value={formData.json_ld}
              onChange={handleChange}
              rows="6"
              placeholder="Enter JSON-LD structured data"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Structured data helps search engines understand your content. 
              <a href="https://schema.org" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline ml-1">
                Learn more about Schema.org
              </a>
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
            ) : (
              <Save className="h-5 w-5 mr-2" />
            )}
            Save SEO Settings
          </button>
        </div>
      </form>

      {/* SEO Tips */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">SEO Best Practices</h3>
        <ul className="text-sm text-blue-700 space-y-1">
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
