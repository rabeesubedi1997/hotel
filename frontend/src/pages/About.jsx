import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { publicAPI, enquiriesAPI } from '../services/api';
import SEO from '../components/SEO';
import useAuthStore from '../stores/authStore';

const About = () => {
  const [about, setAbout] = useState(null);
  const [pageContent, setPageContent] = useState(null);
  const [tourGuides, setTourGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pageRes, guidesRes] = await Promise.all([
        publicAPI.getPage('about'),
        publicAPI.getTourGuides().catch(() => ({ data: [] }))
      ]);
      setAbout(pageRes.data?.sections || pageRes.data);
      // Only take first 3 guides for the team preview
      setTourGuides((guidesRes.data || []).slice(0, 3));
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load page content');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName) => {
    const Icon = LucideIcons[iconName] || LucideIcons.Star;
    return Icon;
  };

  const renderStarRating = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <LucideIcons.Star 
            key={i} 
            className={`h-4 w-4 ${
              i < fullStars 
                ? 'text-yellow-400 fill-yellow-400' 
                : i === fullStars && hasHalfStar 
                  ? 'text-yellow-400 fill-yellow-400/50' 
                  : 'text-gray-300'
            }`} 
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !about) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">About Page</h1>
          <p className="text-gray-600 mb-6">{error || 'Page not available'}</p>
          <Link to="/" className="text-primary-600 hover:underline">Return to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEO 
        title={pageContent?.title || about?.hero?.title || 'About Us'}
        description={pageContent?.meta_description || about?.hero?.subtitle || ''}
      />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20 lg:py-32">
        {about?.hero?.background_image && (
          <div className="absolute inset-0 z-0">
            <img 
              src={about.hero.background_image} 
              alt="About Hero" 
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/90 to-primary-800/90" />
          </div>
        )}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            {about?.hero?.title || 'About Us'}
          </h1>
          <p className="text-xl md:text-2xl text-primary-100 max-w-3xl mx-auto">
            {about?.hero?.subtitle || ''}
          </p>
        </div>
      </section>

      {/* Company Overview */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                {about?.company_info?.title || 'Who We Are'}
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                {about?.company_info?.content || ''}
              </p>
            </div>
            <div className="bg-primary-50 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-6">
                {(about?.stats || []).map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">
                      {stat.value}
                    </div>
                    <div className="text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                <LucideIcons.Target className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{about?.mission?.title || 'Our Mission'}</h3>
              <p className="text-gray-600 leading-relaxed">{about?.mission?.content || ''}</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                <LucideIcons.Eye className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Vision</h3>
              <p className="text-gray-600 leading-relaxed">To become Nepal's leading travel platform</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      {(about?.features || []).length > 0 && (
        <section className="py-16 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {about?.team_section?.title || 'Why Choose Us'}
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {about?.team_section?.subtitle || 'We strive to provide the best travel experience'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {about.features.map((feature, index) => {
                const Icon = getIcon(feature.icon);
                return (
                  <div key={index} className="text-center p-6 rounded-xl bg-gray-50 hover:bg-primary-50 transition-colors">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-8 w-8 text-primary-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Our Story */}
      {about.story_content && (
        <section className="py-16 lg:py-24 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">{about.story_title}</h2>
            <p className="text-lg text-gray-600 leading-relaxed whitespace-pre-wrap">
              {about.story_content}
            </p>
          </div>
        </section>
      )}

      {/* Founders & Leadership Team */}
      {(about?.team_members || []).length > 0 && (
        <section className="py-16 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {about?.team_section?.title || 'Our Leadership'}
              </h2>
              <p className="text-lg text-gray-600">
                {about?.team_section?.subtitle || 'Meet the visionaries behind our company'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {about.team_members.map((member, index) => (
                <div key={index} className="text-center p-6 rounded-2xl bg-gray-50">
                  <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4 overflow-hidden ring-4 ring-white">
                    {member.image ? (
                      <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-100">
                        <LucideIcons.User className="h-12 w-12 text-primary-400" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{member.name}</h3>
                  <p className="text-primary-600 mb-2">{member.role}</p>
                  {member.bio && <p className="text-sm text-gray-500">{member.bio}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tour Guides Section - Can be hired */}
      {tourGuides.length > 0 && (
        <section className="py-16 lg:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Expert Tour Guides</h2>
              <p className="text-lg text-gray-600">Professional guides available for hire</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tourGuides.map((guide) => (
                <div key={guide.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                  <div className="relative h-56 bg-gray-200">
                    <img 
                      src={guide.image || guide.default_image} 
                      alt={guide.name} 
                      className="w-full h-full object-cover"
                    />
                    {guide.is_available_for_hire && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                        Available for Hire
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{guide.name}</h3>
                        <p className="text-primary-600">{guide.role}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center">
                          <LucideIcons.Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          <span className="ml-1 font-semibold">{guide.rating}</span>
                        </div>
                        <p className="text-xs text-gray-500">{guide.total_reviews} reviews</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center text-sm text-gray-600">
                      <LucideIcons.Briefcase className="h-4 w-4 mr-2 text-primary-500" />
                      <span>{guide.trips_completed}+ trips completed</span>
                    </div>
                    
                    {guide.languages?.length > 0 && (
                      <div className="mt-2 flex items-center text-sm text-gray-600">
                        <LucideIcons.Globe className="h-4 w-4 mr-2 text-primary-500" />
                        <span>{guide.languages.slice(0, 3).join(', ')}</span>
                      </div>
                    )}

                    {guide.specialties?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {guide.specialties.slice(0, 3).map((specialty, i) => (
                          <span key={i} className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      {guide.hire_price_per_day ? (
                        <span className="text-lg font-bold text-primary-700">${guide.hire_price_per_day}<span className="text-sm font-normal text-gray-500">/day</span></span>
                      ) : (
                        <span className="text-sm text-gray-500">Contact for pricing</span>
                      )}
                      <Link
                        to={`/tour-guides/${guide.slug}`}
                        className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
                      >
                        Hire
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link
                to="/tour-guides"
                className="inline-flex items-center px-8 py-4 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                <LucideIcons.Users className="h-5 w-5 mr-2" />
                View All Tour Guides
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Contact CTA */}
      <section className="py-16 lg:py-24 bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{about?.contact_cta?.title || 'Get in Touch'}</h2>
          <p className="text-xl text-primary-100 mb-8">{about?.contact_cta?.description || ''}</p>
          <Link
            to={about?.contact_cta?.button_link || '/contact'}
            className="inline-flex items-center px-8 py-4 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            <LucideIcons.Mail className="h-5 w-5 mr-2" />
            {about?.contact_cta?.button_text || 'Contact Us'}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default About;
