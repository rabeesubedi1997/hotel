import { useState, useEffect } from 'react';
import { 
  FileText, 
  Save, 
  Plus, 
  Trash2, 
  GripVertical,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import MediaPicker from '../../components/MediaPicker';

const AboutManagement = () => {
  const [about, setAbout] = useState({
    hero_title: '',
    hero_subtitle: '',
    hero_image: '',
    company_name: '',
    company_description: '',
    mission_title: '',
    mission_description: '',
    vision_title: '',
    vision_description: '',
    story_title: '',
    story_content: '',
    features: [],
    stats: [],
    team_members: [],
    contact_cta_title: '',
    contact_cta_description: '',
    meta_title: '',
    meta_description: '',
    is_published: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('hero');
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState(null);

  useEffect(() => {
    fetchAboutPage();
  }, []);

  const fetchAboutPage = async () => {
    try {
      const response = await adminAPI.getAboutPage();
      setAbout(response.data);
    } catch (error) {
      console.error('Error fetching about page:', error);
      setMessage('Error loading about page');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      await adminAPI.updateAboutPage(about);
      setMessage('About page saved successfully');
    } catch (error) {
      console.error('Error saving about page:', error);
      setMessage('Error saving about page');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const addFeature = () => {
    setAbout(prev => ({
      ...prev,
      features: [...(prev.features || []), { icon: 'Star', title: '', description: '' }]
    }));
  };

  const updateFeature = (index, field, value) => {
    setAbout(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? { ...f, [field]: value } : f)
    }));
  };

  const removeFeature = (index) => {
    setAbout(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const addStat = () => {
    setAbout(prev => ({
      ...prev,
      stats: [...(prev.stats || []), { number: '', label: '' }]
    }));
  };

  const updateStat = (index, field, value) => {
    setAbout(prev => ({
      ...prev,
      stats: prev.stats.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  const removeStat = (index) => {
    setAbout(prev => ({
      ...prev,
      stats: prev.stats.filter((_, i) => i !== index)
    }));
  };

  const addTeamMember = () => {
    setAbout(prev => ({
      ...prev,
      team_members: [...(prev.team_members || []), { name: '', role: '', image: '' }]
    }));
  };

  const updateTeamMember = (index, field, value) => {
    setAbout(prev => ({
      ...prev,
      team_members: prev.team_members.map((m, i) => i === index ? { ...m, [field]: value } : m)
    }));
  };

  const handleTeamMemberImageSelect = (url, index) => {
    updateTeamMember(index, 'image', url);
  };

  const openMediaPicker = (target) => {
    setMediaPickerTarget(target);
    setMediaPickerOpen(true);
  };

  const handleMediaSelect = (url) => {
    if (mediaPickerTarget?.type === 'hero') {
      setAbout(prev => ({ ...prev, hero_image: url }));
    } else if (mediaPickerTarget?.type === 'team') {
      updateTeamMember(mediaPickerTarget.index, 'image', url);
    }
    setMediaPickerOpen(false);
    setMediaPickerTarget(null);
  };
  const removeTeamMember = (index) => {
    setAbout(prev => ({
      ...prev,
      team_members: prev.team_members.filter((_, i) => i !== index)
    }));
  };

  const tabs = [
    { id: 'company', label: 'Company Info' },
    { id: 'mission', label: 'Mission & Vision' },
    { id: 'story', label: 'Our Story' },
    { id: 'features', label: 'Features' },
    { id: 'stats', label: 'Statistics' },
    { id: 'team', label: 'Team' },
    { id: 'cta', label: 'Contact CTA' },
    { id: 'seo', label: 'SEO' },
  ];

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
          <FileText className="h-6 w-6 mr-2" />
          About Page
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAbout(prev => ({ ...prev, is_published: !prev.is_published }))}
            className={`flex items-center px-4 py-2 rounded-lg ${about.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
          >
            {about.is_published ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
            {about.is_published ? 'Published' : 'Draft'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 transition-all"
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {activeTab === 'hero' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hero Title</label>
              <input
                type="text"
                value={about.hero_title}
                onChange={(e) => setAbout(prev => ({ ...prev, hero_title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="About Our Company"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hero Subtitle</label>
              <textarea
                value={about.hero_subtitle}
                onChange={(e) => setAbout(prev => ({ ...prev, hero_subtitle: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Brief description about your company"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image</label>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={about.hero_image || ''}
                    onChange={(e) => setAbout(prev => ({ ...prev, hero_image: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Image URL"
                  />
                  <div className="mt-2">
                    <button
                      onClick={() => openMediaPicker({ type: 'hero' })}
                      className="flex items-center px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm transition-all text-blue-700"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Select from Media Library
                    </button>
                  </div>
                </div>
                {about.hero_image && (
                  <img src={about.hero_image} alt="Hero" className="h-24 w-24 object-cover rounded-lg" />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'company' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={about.company_name}
                onChange={(e) => setAbout(prev => ({ ...prev, company_name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Description</label>
              <textarea
                value={about.company_description}
                onChange={(e) => setAbout(prev => ({ ...prev, company_description: e.target.value }))}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Detailed description of your company"
              />
            </div>
          </div>
        )}

        {activeTab === 'mission' && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold mb-4">Mission</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mission Title</label>
                  <input
                    type="text"
                    value={about.mission_title}
                    onChange={(e) => setAbout(prev => ({ ...prev, mission_title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mission Description</label>
                  <textarea
                    value={about.mission_description}
                    onChange={(e) => setAbout(prev => ({ ...prev, mission_description: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Vision</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vision Title</label>
                  <input
                    type="text"
                    value={about.vision_title}
                    onChange={(e) => setAbout(prev => ({ ...prev, vision_title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vision Description</label>
                  <textarea
                    value={about.vision_description}
                    onChange={(e) => setAbout(prev => ({ ...prev, vision_description: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'story' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Story Title</label>
              <input
                type="text"
                value={about.story_title}
                onChange={(e) => setAbout(prev => ({ ...prev, story_title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Story Content</label>
              <textarea
                value={about.story_content}
                onChange={(e) => setAbout(prev => ({ ...prev, story_content: e.target.value }))}
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Tell your company's story..."
              />
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Features</h3>
              <button
                onClick={addFeature}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Feature
              </button>
            </div>
            {(about.features || []).map((feature, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={feature.icon}
                    onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                    placeholder="Icon name (e.g., Shield)"
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={feature.title}
                    onChange={(e) => updateFeature(index, 'title', e.target.value)}
                    placeholder="Feature title"
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={feature.description}
                    onChange={(e) => updateFeature(index, 'description', e.target.value)}
                    placeholder="Description"
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <button
                  onClick={() => removeFeature(index)}
                  className="p-2 text-red-500 hover:bg-red-50 hover:shadow-md rounded transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Statistics</h3>
              <button
                onClick={addStat}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Stat
              </button>
            </div>
            {(about.stats || []).map((stat, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={stat.number}
                    onChange={(e) => updateStat(index, 'number', e.target.value)}
                    placeholder="Number (e.g., 500+)"
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={stat.label}
                    onChange={(e) => updateStat(index, 'label', e.target.value)}
                    placeholder="Label (e.g., Hotels)"
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <button
                  onClick={() => removeStat(index)}
                  className="p-2 text-red-500 hover:bg-red-50 hover:shadow-md rounded transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Team Members (Leadership/Founders)</h3>
              <button
                onClick={addTeamMember}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </button>
            </div>
            {(about.team_members || []).map((member, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                    placeholder="Name"
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={member.role}
                    onChange={(e) => updateTeamMember(index, 'role', e.target.value)}
                    placeholder="Role (e.g., CEO, Founder)"
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={member.bio || ''}
                    onChange={(e) => updateTeamMember(index, 'bio', e.target.value)}
                    placeholder="Short bio (optional)"
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                
                {/* Image Upload Section */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 border-2 border-dashed border-gray-300">
                      {member.image ? (
                        <img 
                          src={member.image} 
                          alt={member.name || 'Preview'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <ImageIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={member.image || ''}
                      onChange={(e) => updateTeamMember(index, 'image', e.target.value)}
                      placeholder="Image URL or select from Media Library"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => openMediaPicker({ type: 'team', index })}
                        className="flex items-center px-3 py-1.5 bg-blue-100 hover:bg-blue-200 hover:shadow-md rounded text-sm transition-all text-blue-700"
                      >
                        <ImageIcon className="h-4 w-4 mr-1" />
                        Select from Media Library
                      </button>
                      <button
                        onClick={() => updateTeamMember(index, 'image', '')}
                        className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => removeTeamMember(index)}
                    className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 hover:shadow-md rounded transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'cta' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CTA Title</label>
              <input
                type="text"
                value={about.contact_cta_title}
                onChange={(e) => setAbout(prev => ({ ...prev, contact_cta_title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Have Questions?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CTA Description</label>
              <textarea
                value={about.contact_cta_description}
                onChange={(e) => setAbout(prev => ({ ...prev, contact_cta_description: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="We'd love to hear from you..."
              />
            </div>
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
              <input
                type="text"
                value={about.meta_title || ''}
                onChange={(e) => setAbout(prev => ({ ...prev, meta_title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="About Us - Your Company Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
              <textarea
                value={about.meta_description || ''}
                onChange={(e) => setAbout(prev => ({ ...prev, meta_description: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Brief description for search engines"
              />
            </div>
          </div>
        )}
      </div>
      <MediaPicker
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
};

export default AboutManagement;
