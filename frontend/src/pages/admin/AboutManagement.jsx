import { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import MediaPicker from '../../components/MediaPicker';
import { Button, Input, Textarea } from '../../components/ui';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-2xl font-bold text-neutral-900 flex items-center">
          <FileText className="h-6 w-6 mr-2 text-primary-600" />
          About Page
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAbout(prev => ({ ...prev, is_published: !prev.is_published }))}
            className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${about.is_published ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
          >
            {about.is_published ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
            {about.is_published ? 'Published' : 'Draft'}
          </button>
          <Button onClick={handleSave} loading={saving} disabled={saving}>
            {!saving && <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center ${message.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {message.includes('Error') ? <AlertCircle className="h-5 w-5 mr-2 shrink-0" /> : <Check className="h-5 w-5 mr-2 shrink-0" />}
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        {activeTab === 'hero' && (
          <div className="space-y-6">
            <Input
              label="Hero Title"
              type="text"
              value={about.hero_title}
              onChange={(e) => setAbout(prev => ({ ...prev, hero_title: e.target.value }))}
              placeholder="About Our Company"
            />
            <Textarea
              label="Hero Subtitle"
              value={about.hero_subtitle}
              onChange={(e) => setAbout(prev => ({ ...prev, hero_subtitle: e.target.value }))}
              rows={3}
              placeholder="Brief description about your company"
            />
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Hero Image</label>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={about.hero_image || ''}
                    onChange={(e) => setAbout(prev => ({ ...prev, hero_image: e.target.value }))}
                    placeholder="Image URL"
                  />
                  <div className="mt-2">
                    <Button variant="secondary" size="sm" onClick={() => openMediaPicker({ type: 'hero' })}>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Select from Media Library
                    </Button>
                  </div>
                </div>
                {about.hero_image && (
                  <img src={about.hero_image} alt="Hero" className="h-24 w-24 object-cover rounded-xl" />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'company' && (
          <div className="space-y-6">
            <Input
              label="Company Name"
              type="text"
              value={about.company_name}
              onChange={(e) => setAbout(prev => ({ ...prev, company_name: e.target.value }))}
            />
            <Textarea
              label="Company Description"
              value={about.company_description}
              onChange={(e) => setAbout(prev => ({ ...prev, company_description: e.target.value }))}
              rows={5}
              placeholder="Detailed description of your company"
            />
          </div>
        )}

        {activeTab === 'mission' && (
          <div className="space-y-6">
            <div className="border-b border-neutral-100 pb-6">
              <h3 className="font-display text-lg font-semibold text-neutral-900 mb-4">Mission</h3>
              <div className="space-y-4">
                <Input
                  label="Mission Title"
                  type="text"
                  value={about.mission_title}
                  onChange={(e) => setAbout(prev => ({ ...prev, mission_title: e.target.value }))}
                />
                <Textarea
                  label="Mission Description"
                  value={about.mission_description}
                  onChange={(e) => setAbout(prev => ({ ...prev, mission_description: e.target.value }))}
                  rows={4}
                />
              </div>
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-neutral-900 mb-4">Vision</h3>
              <div className="space-y-4">
                <Input
                  label="Vision Title"
                  type="text"
                  value={about.vision_title}
                  onChange={(e) => setAbout(prev => ({ ...prev, vision_title: e.target.value }))}
                />
                <Textarea
                  label="Vision Description"
                  value={about.vision_description}
                  onChange={(e) => setAbout(prev => ({ ...prev, vision_description: e.target.value }))}
                  rows={4}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'story' && (
          <div className="space-y-6">
            <Input
              label="Story Title"
              type="text"
              value={about.story_title}
              onChange={(e) => setAbout(prev => ({ ...prev, story_title: e.target.value }))}
            />
            <Textarea
              label="Story Content"
              value={about.story_content}
              onChange={(e) => setAbout(prev => ({ ...prev, story_content: e.target.value }))}
              rows={10}
              placeholder="Tell your company's story..."
            />
          </div>
        )}

        {activeTab === 'features' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-lg font-semibold text-neutral-900">Features</h3>
              <Button size="sm" onClick={addFeature}>
                <Plus className="h-4 w-4 mr-2" />
                Add Feature
              </Button>
            </div>
            {(about.features || []).map((feature, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-neutral-50 rounded-xl">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    type="text"
                    value={feature.icon}
                    onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                    placeholder="Icon name (e.g., Shield)"
                  />
                  <Input
                    type="text"
                    value={feature.title}
                    onChange={(e) => updateFeature(index, 'title', e.target.value)}
                    placeholder="Feature title"
                  />
                  <Input
                    type="text"
                    value={feature.description}
                    onChange={(e) => updateFeature(index, 'description', e.target.value)}
                    placeholder="Description"
                  />
                </div>
                <button
                  onClick={() => removeFeature(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
              <h3 className="font-display text-lg font-semibold text-neutral-900">Statistics</h3>
              <Button size="sm" onClick={addStat}>
                <Plus className="h-4 w-4 mr-2" />
                Add Stat
              </Button>
            </div>
            {(about.stats || []).map((stat, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-neutral-50 rounded-xl">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    type="text"
                    value={stat.number}
                    onChange={(e) => updateStat(index, 'number', e.target.value)}
                    placeholder="Number (e.g., 500+)"
                  />
                  <Input
                    type="text"
                    value={stat.label}
                    onChange={(e) => updateStat(index, 'label', e.target.value)}
                    placeholder="Label (e.g., Hotels)"
                  />
                </div>
                <button
                  onClick={() => removeStat(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
              <h3 className="font-display text-lg font-semibold text-neutral-900">Team Members (Leadership/Founders)</h3>
              <Button size="sm" onClick={addTeamMember}>
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>
            {(about.team_members || []).map((member, index) => (
              <div key={index} className="p-4 bg-neutral-50 rounded-xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    type="text"
                    value={member.name}
                    onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                    placeholder="Name"
                  />
                  <Input
                    type="text"
                    value={member.role}
                    onChange={(e) => updateTeamMember(index, 'role', e.target.value)}
                    placeholder="Role (e.g., CEO, Founder)"
                  />
                  <Input
                    type="text"
                    value={member.bio || ''}
                    onChange={(e) => updateTeamMember(index, 'bio', e.target.value)}
                    placeholder="Short bio (optional)"
                  />
                </div>

                {/* Image Upload Section */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-200 border-2 border-dashed border-neutral-300">
                      {member.image ? (
                        <img
                          src={member.image}
                          alt={member.name || 'Preview'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                          <ImageIcon className="h-8 w-8 text-neutral-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={member.image || ''}
                      onChange={(e) => updateTeamMember(index, 'image', e.target.value)}
                      placeholder="Image URL or select from Media Library"
                      className="mb-2"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openMediaPicker({ type: 'team', index })}
                      >
                        <ImageIcon className="h-4 w-4 mr-1" />
                        Select from Media Library
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateTeamMember(index, 'image', '')}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <button
                    onClick={() => removeTeamMember(index)}
                    className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
            <Input
              label="CTA Title"
              type="text"
              value={about.contact_cta_title}
              onChange={(e) => setAbout(prev => ({ ...prev, contact_cta_title: e.target.value }))}
              placeholder="Have Questions?"
            />
            <Textarea
              label="CTA Description"
              value={about.contact_cta_description}
              onChange={(e) => setAbout(prev => ({ ...prev, contact_cta_description: e.target.value }))}
              rows={3}
              placeholder="We'd love to hear from you..."
            />
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="space-y-6">
            <Input
              label="Meta Title"
              type="text"
              value={about.meta_title || ''}
              onChange={(e) => setAbout(prev => ({ ...prev, meta_title: e.target.value }))}
              placeholder="About Us - Your Company Name"
            />
            <Textarea
              label="Meta Description"
              value={about.meta_description || ''}
              onChange={(e) => setAbout(prev => ({ ...prev, meta_description: e.target.value }))}
              rows={3}
              placeholder="Brief description for search engines"
            />
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
