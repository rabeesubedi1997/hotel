import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { publicAPI } from '../services/api';
import SEO from '../components/SEO';

const TourGuides = () => {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageContent, setPageContent] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchGuides();
    fetchPageContent();
  }, []);

  const fetchPageContent = async () => {
    try {
      const response = await publicAPI.getPage('tour-guides');
      setPageContent(response.data);
    } catch (err) {
      console.error('Error fetching page content:', err);
    }
  };

  const fetchGuides = async () => {
    try {
      const response = await publicAPI.getTourGuides();
      setGuides(response.data || []);
    } catch (err) {
      console.error('Error fetching guides:', err);
      setError('Failed to load tour guides');
    } finally {
      setLoading(false);
    }
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

  const specialties = [...new Set(guides.flatMap(g => g.specialties || []))];

  const filteredGuides = filter === 'all' 
    ? guides 
    : guides.filter(g => g.specialties?.includes(filter));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tour Guides</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/" className="text-primary-600 hover:underline">Return to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO 
        title={pageContent?.title || "Expert Tour Guides - ReserveNow"}
        description={pageContent?.meta_description || "Meet our professional tour guides with years of experience"}
      />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16 lg:py-24">
        {pageContent?.sections?.hero?.background_image && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${pageContent.sections.hero.background_image})` }}
          />
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {pageContent?.sections?.hero?.title || 'Meet Our Expert Tour Guides'}
          </h1>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto">
            {pageContent?.sections?.hero?.subtitle || 'Professional guides with years of experience ready to make your journey unforgettable'}
          </p>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-gray-600 mr-2">{pageContent?.sections?.filters?.specialty_label || "Filter by specialty:"}</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              All
            </button>
            {specialties.map(specialty => (
              <button
                key={specialty}
                onClick={() => setFilter(specialty)}
                className={`px-4 py-2 rounded-full text-sm ${filter === specialty ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {specialty}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Guides Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredGuides.length === 0 ? (
            <div className="text-center py-12">
              <LucideIcons.Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No tour guides found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredGuides.map((guide) => (
                <Link
                  key={guide.id}
                  to={`/tour-guides/${guide.slug}`}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <div className="relative h-64 bg-gray-200">
                    <img 
                      src={guide.image || guide.default_image} 
                      alt={guide.name} 
                      className="w-full h-full object-cover"
                    />
                    {guide.is_available_for_hire && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                        {pageContent?.sections?.guide_card?.available_badge || "Available"}
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{guide.name}</h3>
                    <p className="text-primary-600 font-medium mb-3">{guide.role}</p>
                    
                    {renderStarRating(guide.rating)}
                    
                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <LucideIcons.Briefcase className="h-4 w-4 mr-2 text-primary-500" />
                        <span>{guide.trips_completed}+ {pageContent?.sections?.guide_card?.trips_label || "trips completed"}</span>
                      </div>
                      {guide.languages?.length > 0 && (
                        <div className="flex items-center">
                          <LucideIcons.Globe className="h-4 w-4 mr-2 text-primary-500" />
                          <span>{pageContent?.sections?.guide_card?.languages_label || "Languages"}: {guide.languages.slice(0, 3).join(', ')}{guide.languages.length > 3 && '...'}</span>
                        </div>
                      )}
                    </div>

                    {guide.specialties?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {guide.specialties.slice(0, 3).map((specialty, i) => (
                          <span key={i} className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded">
                            {specialty}
                          </span>
                        ))}
                        {guide.specialties.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            +{guide.specialties.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {guide.hire_price_per_day && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-lg font-bold text-primary-700">${guide.hire_price_per_day}<span className="text-sm font-normal text-gray-500">{pageContent?.sections?.guide_card?.price_label || "/day"}</span></p>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default TourGuides;
