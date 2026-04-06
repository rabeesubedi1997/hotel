import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, X, Save, Eye, Layout, Type, Image as ImageIcon } from 'lucide-react';
import { adminAPI } from '../../services/api';
import MediaPicker from '../../components/MediaPicker';

const PagesManagement = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingPage, setEditingPage] = useState(null);
  const [activeTab, setActiveTab] = useState('hero');
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState(null);

  // Form state for editing
  const [formData, setFormData] = useState({
    title: '',
    meta_description: '',
    is_active: true,
    sections: {
      hero: {
        title: '',
        subtitle: '',
        button_text: '',
        button_link: '',
        secondary_button_text: '',
        secondary_button_link: '',
        background_image: '',
      },
      trust_badges: [
        { icon: 'shield', title: '', subtitle: '' },
        { icon: 'clock', title: '', subtitle: '' },
        { icon: 'star', title: '', subtitle: '' },
      ],
      hotels_section: {
        subtitle: '',
        title: '',
        description: '',
        button_text: '',
        button_link: '',
      },
      adventure_banner: {
        title: '',
        description: '',
        button_text: '',
        button_link: '',
        background_image: '',
      },
      activities_section: {
        subtitle: '',
        title: '',
        description: '',
        button_text: '',
        button_link: '',
      },
      newsletter: {
        title: '',
        description: '',
        button_text: '',
        placeholder: '',
      },
    },
  });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPages();
      setPages(response.data);
    } catch (error) {
      console.error('Error fetching pages:', error);
      setMessage('Error loading pages');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (page) => {
    setEditingPage(page);
    setActiveTab('hero');
    
    // Default sections based on page type
    const defaultSections = page.slug === 'about' ? {
      hero: {
        title: 'About Reserve Now',
        subtitle: 'Your trusted partner for unforgettable experiences in Nepal',
        background_image: '',
        ...page.sections?.hero,
      },
      company_info: {
        title: 'Who We Are',
        content: 'Reserve Now is Nepal\'s premier platform for booking hotels and adventure activities.',
        ...page.sections?.company_info,
      },
      mission: {
        title: 'Our Mission',
        content: 'To make travel planning in Nepal seamless and enjoyable.',
        ...page.sections?.mission,
      },
      vision: {
        title: 'Our Vision',
        content: 'To become the go-to platform for all travel needs in Nepal.',
        ...page.sections?.vision,
      },
      features: [
        { icon: 'shield', title: 'Secure Booking', description: '100% secure payment' },
        { icon: 'clock', title: '24/7 Support', description: 'Always here to help' },
        { icon: 'star', title: 'Best Price', description: 'Lowest rates guaranteed' },
        { icon: 'award', title: 'Verified', description: 'All hotels verified' },
        ...(page.sections?.features || []),
      ],
      stats: [
        { label: 'Hotels', value: '100+' },
        { label: 'Activities', value: '50+' },
        { label: 'Happy Travelers', value: '10,000+' },
        { label: 'Cities', value: '15+' },
        ...(page.sections?.stats || []),
      ],
      team_section: {
        title: 'Meet Our Team',
        subtitle: 'The people behind your amazing experiences',
        ...page.sections?.team_section,
      },
      team_members: [
        { name: 'John Doe', role: 'Founder & CEO', bio: 'Travel enthusiast', image: '' },
        { name: 'Jane Smith', role: 'Operations Manager', bio: 'Hospitality expert', image: '' },
        { name: 'Mike Johnson', role: 'Head of Marketing', bio: 'Digital specialist', image: '' },
        ...(page.sections?.team_members || []),
      ],
      contact_cta: {
        title: 'Get in Touch',
        description: 'Have questions? We\'d love to hear from you.',
        button_text: 'Contact Us',
        button_link: '/contact',
        ...page.sections?.contact_cta,
      },
    } : {
      hero: {
        title: 'Discover Nepal',
        subtitle: "Luxury hotels and thrilling adventures await",
        button_text: 'Browse Hotels',
        button_link: '/hotels',
        secondary_button_text: 'Explore Activities',
        secondary_button_link: '/activities',
        background_image: '',
        ...page.sections?.hero,
      },
      trust_badges: page.sections?.trust_badges || [
        { icon: 'shield', title: 'Secure Booking', subtitle: '100% secure payment' },
        { icon: 'clock', title: '24/7 Support', subtitle: 'Always here to help' },
        { icon: 'star', title: 'Best Price Guarantee', subtitle: 'Lowest rates guaranteed' },
      ],
      hotels_section: {
        subtitle: 'Premium Stays',
        title: 'Featured Hotels',
        description: "Experience luxury and comfort at Nepal's finest hotels",
        button_text: 'View All Hotels',
        button_link: '/hotels',
        ...page.sections?.hotels_section,
      },
      adventure_banner: {
        title: 'Ready for Adventure?',
        description: "From bungee jumping to paragliding, experience the thrill of Nepal's most exciting activities",
        button_text: 'Explore Activities',
        button_link: '/activities',
        background_image: '',
        ...page.sections?.adventure_banner,
      },
      activities_section: {
        subtitle: 'Thrilling Experiences',
        title: 'Featured Adventures',
        description: 'Push your limits with our curated selection of activities',
        button_text: 'View All Activities',
        button_link: '/activities',
        ...page.sections?.activities_section,
      },
      newsletter: {
        title: 'Get Exclusive Deals',
        description: 'Subscribe to receive special offers on hotels and activities',
        button_text: 'Subscribe',
        placeholder: 'Enter your email',
        ...page.sections?.newsletter,
      },
    };

    setFormData({
      title: page.title,
      meta_description: page.meta_description || '',
      is_active: page.is_active,
      sections: defaultSections,
    });
  };

  const handleSave = async () => {
    try {
      await adminAPI.updatePage(editingPage.id, formData);
      setMessage('Page updated successfully!');
      fetchPages();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving page:', error);
      setMessage('Error saving page');
    }
  };

  const handleSectionChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: {
          ...prev.sections[section],
          [field]: value,
        },
      },
    }));
  };

  const handleTrustBadgeChange = (index, field, value) => {
    setFormData(prev => {
      const newBadges = [...prev.sections.trust_badges];
      newBadges[index] = { ...newBadges[index], [field]: value };
      return {
        ...prev,
        sections: {
          ...prev.sections,
          trust_badges: newBadges,
        },
      };
    });
  };

  const openMediaPicker = (section, field) => {
    setMediaPickerTarget({ section, field });
    setMediaPickerOpen(true);
  };

  const handleMediaSelect = (url) => {
    if (mediaPickerTarget) {
      // Handle team member images specially
      if (mediaPickerTarget.section === 'team_member') {
        const newMembers = [...formData.sections.team_members];
        newMembers[mediaPickerTarget.field] = { 
          ...newMembers[mediaPickerTarget.field], 
          image: url 
        };
        handleSectionChange('team_members', null, newMembers);
      } else {
        handleSectionChange(mediaPickerTarget.section, mediaPickerTarget.field, url);
      }
    }
    setMediaPickerOpen(false);
    setMediaPickerTarget(null);
  };

  const tabs = editingPage?.slug === 'about' ? [
    { id: 'hero', label: 'Hero Section', icon: Layout },
    { id: 'company_info', label: 'Company Info', icon: Building },
    { id: 'mission', label: 'Mission & Vision', icon: Target },
    { id: 'features', label: 'Features', icon: Sparkles },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
    { id: 'team_members', label: 'Team Members', icon: Users },
    { id: 'contact_cta', label: 'Contact CTA', icon: Mail },
  ] : editingPage?.slug === 'hotels' ? [
    { id: 'hero', label: 'Hero Section', icon: Layout },
    { id: 'filters', label: 'Filters', icon: Filter },
    { id: 'results', label: 'Results Text', icon: List },
    { id: 'empty_state', label: 'Empty State', icon: Inbox },
  ] : editingPage?.slug === 'activities' ? [
    { id: 'hero', label: 'Hero Section', icon: Layout },
    { id: 'filters', label: 'Filters', icon: Filter },
    { id: 'results', label: 'Results Text', icon: List },
    { id: 'empty_state', label: 'Empty State', icon: Inbox },
  ] : editingPage?.slug === 'tour-guides' ? [
    { id: 'hero', label: 'Hero Section', icon: Layout },
    { id: 'filters', label: 'Filters', icon: Filter },
    { id: 'guide_card', label: 'Guide Card', icon: User },
  ] : editingPage?.slug === 'contact' ? [
    { id: 'hero', label: 'Hero Section', icon: Layout },
    { id: 'contact_info', label: 'Contact Info', icon: MapPin },
  ] : [
    { id: 'hero', label: 'Hero Section', icon: Layout },
    { id: 'trust_badges', label: 'Trust Badges', icon: Shield },
    { id: 'hotels_section', label: 'Hotels Section', icon: Hotel },
    { id: 'adventure_banner', label: 'Adventure Banner', icon: Compass },
    { id: 'activities_section', label: 'Activities Section', icon: Activity },
    { id: 'newsletter', label: 'Newsletter', icon: Mail },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Pages Management</h2>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Pages List */}
      {!editingPage && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pages.map((page) => (
                <tr key={page.id}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{page.title}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{page.slug}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${page.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {page.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(page)}
                      className="p-2 text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Page */}
      {editingPage && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-xl font-bold text-gray-900">Edit {editingPage.title}</h3>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </button>
              <button
                onClick={() => setEditingPage(null)}
                className="p-2 text-gray-600 hover:text-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex">
            {/* Sidebar Tabs */}
            <div className="w-64 border-r bg-gray-50">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium transition ${
                      activeTab === tab.id
                        ? 'bg-white text-primary-600 border-r-2 border-primary-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6">
              {/* Hero Section */}
              {activeTab === 'hero' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Hero Section</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={formData.sections.hero.title}
                      onChange={(e) => handleSectionChange('hero', 'title', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                    <input
                      type="text"
                      value={formData.sections.hero.subtitle}
                      onChange={(e) => handleSectionChange('hero', 'subtitle', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Primary Button Text</label>
                      <input
                        type="text"
                        value={formData.sections.hero.button_text}
                        onChange={(e) => handleSectionChange('hero', 'button_text', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Primary Button Link</label>
                      <input
                        type="text"
                        value={formData.sections.hero.button_link}
                        onChange={(e) => handleSectionChange('hero', 'button_link', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Button Text</label>
                      <input
                        type="text"
                        value={formData.sections.hero.secondary_button_text}
                        onChange={(e) => handleSectionChange('hero', 'secondary_button_text', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Button Link</label>
                      <input
                        type="text"
                        value={formData.sections.hero.secondary_button_link}
                        onChange={(e) => handleSectionChange('hero', 'secondary_button_link', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Background Image</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.sections.hero.background_image || ''}
                        onChange={(e) => handleSectionChange('hero', 'background_image', e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Image URL..."
                      />
                      <button
                        type="button"
                        onClick={() => openMediaPicker('hero', 'background_image')}
                        className="flex items-center px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm text-blue-700"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Select
                      </button>
                    </div>
                    {formData.sections.hero.background_image && (
                      <img
                        src={formData.sections.hero.background_image}
                        alt="Hero background"
                        className="mt-2 h-32 w-full object-cover rounded-lg"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Trust Badges */}
              {activeTab === 'trust_badges' && (
                <div className="space-y-6">
                  <h4 className="font-semibold text-gray-900">Trust Badges</h4>
                  {formData.sections.trust_badges.map((badge, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      <h5 className="font-medium text-gray-700 mb-3">Badge {index + 1}</h5>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                          <select
                            value={badge.icon}
                            onChange={(e) => handleTrustBadgeChange(index, 'icon', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="shield">Shield</option>
                            <option value="clock">Clock</option>
                            <option value="star">Star</option>
                            <option value="check">Check</option>
                            <option value="heart">Heart</option>
                            <option value="award">Award</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={badge.title}
                            onChange={(e) => handleTrustBadgeChange(index, 'title', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                          <input
                            type="text"
                            value={badge.subtitle}
                            onChange={(e) => handleTrustBadgeChange(index, 'subtitle', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Adventure Banner - The "Ready for Adventure?" section */}
              {activeTab === 'adventure_banner' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Adventure Banner (Ready for Adventure?)</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={formData.sections.adventure_banner.title}
                      onChange={(e) => handleSectionChange('adventure_banner', 'title', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      rows="3"
                      value={formData.sections.adventure_banner.description}
                      onChange={(e) => handleSectionChange('adventure_banner', 'description', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                      <input
                        type="text"
                        value={formData.sections.adventure_banner.button_text}
                        onChange={(e) => handleSectionChange('adventure_banner', 'button_text', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
                      <input
                        type="text"
                        value={formData.sections.adventure_banner.button_link}
                        onChange={(e) => handleSectionChange('adventure_banner', 'button_link', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Background Image</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.sections.adventure_banner.background_image || ''}
                        onChange={(e) => handleSectionChange('adventure_banner', 'background_image', e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Image URL..."
                      />
                      <button
                        type="button"
                        onClick={() => openMediaPicker('adventure_banner', 'background_image')}
                        className="flex items-center px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm text-blue-700"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Select
                      </button>
                    </div>
                    {formData.sections.adventure_banner.background_image && (
                      <img
                        src={formData.sections.adventure_banner.background_image}
                        alt="Adventure banner"
                        className="mt-2 h-32 w-full object-cover rounded-lg"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Other sections follow similar pattern */}
              {['hotels_section', 'activities_section', 'newsletter'].includes(activeTab) && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">
                    {activeTab === 'hotels_section' && 'Hotels Section'}
                    {activeTab === 'activities_section' && 'Activities Section'}
                    {activeTab === 'newsletter' && 'Newsletter Section'}
                  </h4>
                  {Object.entries(formData.sections[activeTab]).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                        {key.replace(/_/g, ' ')}
                      </label>
                      {key === 'description' ? (
                        <textarea
                          rows="3"
                          value={value}
                          onChange={(e) => handleSectionChange(activeTab, key, e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleSectionChange(activeTab, key, e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* About Page - Company Info */}
              {activeTab === 'company_info' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Company Information</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={formData.sections.company_info?.title || ''}
                      onChange={(e) => handleSectionChange('company_info', 'title', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                    <textarea
                      rows="5"
                      value={formData.sections.company_info?.content || ''}
                      onChange={(e) => handleSectionChange('company_info', 'content', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              {/* About Page - Mission & Vision */}
              {activeTab === 'mission' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Mission & Vision</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mission Title</label>
                    <input
                      type="text"
                      value={formData.sections.mission?.title || ''}
                      onChange={(e) => handleSectionChange('mission', 'title', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mission Content</label>
                    <textarea
                      rows="3"
                      value={formData.sections.mission?.content || ''}
                      onChange={(e) => handleSectionChange('mission', 'content', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              {/* About Page - Statistics */}
              {activeTab === 'stats' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Statistics</h4>
                  {(formData.sections.stats || []).map((stat, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      <h5 className="font-medium text-gray-700 mb-3">Stat {index + 1}</h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                          <input
                            type="text"
                            value={stat.label}
                            onChange={(e) => {
                              const newStats = [...formData.sections.stats];
                              newStats[index] = { ...stat, label: e.target.value };
                              handleSectionChange('stats', null, newStats);
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                          <input
                            type="text"
                            value={stat.value}
                            onChange={(e) => {
                              const newStats = [...formData.sections.stats];
                              newStats[index] = { ...stat, value: e.target.value };
                              handleSectionChange('stats', null, newStats);
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* About Page - Contact CTA */}
              {activeTab === 'contact_cta' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Contact Call-to-Action</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={formData.sections.contact_cta?.title || ''}
                      onChange={(e) => handleSectionChange('contact_cta', 'title', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      rows="3"
                      value={formData.sections.contact_cta?.description || ''}
                      onChange={(e) => handleSectionChange('contact_cta', 'description', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                      <input
                        type="text"
                        value={formData.sections.contact_cta?.button_text || ''}
                        onChange={(e) => handleSectionChange('contact_cta', 'button_text', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
                      <input
                        type="text"
                        value={formData.sections.contact_cta?.button_link || ''}
                        onChange={(e) => handleSectionChange('contact_cta', 'button_link', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              )}
              {/* About Page - Features */}
              {activeTab === 'features' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Features (Why Choose Us)</h4>
                  {(formData.sections.features || []).map((feature, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      <h5 className="font-medium text-gray-700 mb-3">Feature {index + 1}</h5>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                          <select
                            value={feature.icon}
                            onChange={(e) => {
                              const newFeatures = [...formData.sections.features];
                              newFeatures[index] = { ...feature, icon: e.target.value };
                              handleSectionChange('features', null, newFeatures);
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="shield">Shield</option>
                            <option value="clock">Clock</option>
                            <option value="star">Star</option>
                            <option value="check">Check</option>
                            <option value="heart">Heart</option>
                            <option value="award">Award</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={feature.title}
                            onChange={(e) => {
                              const newFeatures = [...formData.sections.features];
                              newFeatures[index] = { ...feature, title: e.target.value };
                              handleSectionChange('features', null, newFeatures);
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <input
                            type="text"
                            value={feature.description}
                            onChange={(e) => {
                              const newFeatures = [...formData.sections.features];
                              newFeatures[index] = { ...feature, description: e.target.value };
                              handleSectionChange('features', null, newFeatures);
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* About Page - Team Members */}
              {activeTab === 'team_members' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Team Members</h4>
                  {(formData.sections.team_members || []).map((member, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      <h5 className="font-medium text-gray-700 mb-3">Member {index + 1}</h5>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => {
                              const newMembers = [...formData.sections.team_members];
                              newMembers[index] = { ...member, name: e.target.value };
                              handleSectionChange('team_members', null, newMembers);
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                          <input
                            type="text"
                            value={member.role}
                            onChange={(e) => {
                              const newMembers = [...formData.sections.team_members];
                              newMembers[index] = { ...member, role: e.target.value };
                              handleSectionChange('team_members', null, newMembers);
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                          <input
                            type="text"
                            value={member.bio}
                            onChange={(e) => {
                              const newMembers = [...formData.sections.team_members];
                              newMembers[index] = { ...member, bio: e.target.value };
                              handleSectionChange('team_members', null, newMembers);
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={member.image || ''}
                              onChange={(e) => {
                                const newMembers = [...formData.sections.team_members];
                                newMembers[index] = { ...member, image: e.target.value };
                                handleSectionChange('team_members', null, newMembers);
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              placeholder="Image URL..."
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setMediaPickerTarget({ section: 'team_member', field: index });
                                setMediaPickerOpen(true);
                              }}
                              className="flex items-center px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm text-blue-700"
                            >
                              <ImageIcon className="h-4 w-4 mr-2" />
                              Select
                            </button>
                          </div>
                          {member.image && (
                            <img
                              src={member.image}
                              alt={member.name}
                              className="mt-2 h-32 w-full object-cover rounded-lg"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MediaPicker Modal */}
      <MediaPicker
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
};

// Icon imports for tabs
import { Shield, Hotel, Compass, Activity, Mail, Building, Target, BarChart3, Filter, List, Inbox, User, MapPin, Users, Sparkles } from 'lucide-react';

export default PagesManagement;
