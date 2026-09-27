import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Briefcase, Globe } from 'lucide-react';
import { publicAPI } from '../services/api';
import SEO from '../components/SEO';
import { Card, Badge, RatingStars, Container } from '../components/ui';
import AddToTripButton from '../components/AddToTripButton';
import DestinationShortcuts from '../components/DestinationShortcuts';
import TrustStrip from '../components/TrustStrip';

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
          <h1 className="font-display text-2xl font-bold text-neutral-900 mb-4">Tour Guides</h1>
          <p className="text-neutral-600 mb-6">{error}</p>
          <Link to="/" className="text-primary-600 hover:underline">Return to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <SEO
        title={pageContent?.title || "Expert Tour Guides - ReserveNow"}
        description={pageContent?.meta_description || "Meet our professional tour guides with years of experience"}
      />

      {/* Hero Section */}
      <section className="relative bg-neutral-900 text-white py-16 lg:py-24 overflow-hidden">
        {pageContent?.sections?.hero?.background_image && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity"
            style={{ backgroundImage: `url(${pageContent.sections.hero.background_image})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent" />
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-primary-500/25 blur-3xl pointer-events-none" />
        <Container className="relative text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            {pageContent?.sections?.hero?.title || 'Meet Our Expert Tour Guides'}
          </h1>
          <p className="text-xl text-neutral-200 max-w-2xl mx-auto">
            {pageContent?.sections?.hero?.subtitle || 'Professional guides with years of experience ready to make your journey unforgettable'}
          </p>
          {guides.length > 0 && (
            <div className="mt-8">
              <span className="font-display text-2xl sm:text-3xl font-bold text-primary-300 block">{guides.length}</span>
              <span className="text-xs sm:text-sm text-neutral-300 uppercase tracking-wide">Expert Guides</span>
            </div>
          )}
        </Container>
      </section>

      <Container className="pt-10">
        <TrustStrip badges={pageContent?.sections?.trust_badges} />
      </Container>

      {/* Filter Section */}
      <section className="py-8 bg-white border-b border-neutral-100 mt-6">
        <Container>
          <DestinationShortcuts type="activities" title="Explore by Region" className="mb-8" />
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-neutral-600 mr-2">{pageContent?.sections?.filters?.specialty_label || "Filter by specialty:"}</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
            >
              All
            </button>
            {specialties.map(specialty => (
              <button
                key={specialty}
                onClick={() => setFilter(specialty)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === specialty ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
              >
                {specialty}
              </button>
            ))}
          </div>
        </Container>
      </section>

      {/* Guides Grid */}
      <section className="py-16">
        <Container>
          {filteredGuides.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-neutral-300 mb-4" />
              <p className="text-neutral-500">No tour guides found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {filteredGuides.map((guide) => (
                <Card key={guide.id} as={Link} to={`/tour-guides/${guide.slug}`}>
                  <div className="relative h-56 sm:h-64 bg-neutral-200">
                    <img
                      src={guide.image || guide.default_image}
                      alt={guide.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4">
                      {guide.is_available_for_hire ? (
                        <Badge tone="success">
                          {pageContent?.sections?.guide_card?.available_badge || "Available"}
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Currently unavailable</Badge>
                      )}
                    </div>
                    <AddToTripButton
                      bookableType="tour_guide"
                      bookableId={guide.id}
                      bookableName={guide.name}
                      variant="icon"
                      className="absolute top-3 left-3 z-10"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-xl font-bold text-neutral-900 mb-1">{guide.name}</h3>
                    <p className="text-primary-600 font-medium mb-3">{guide.role}</p>

                    <RatingStars rating={guide.rating} reviewCount={guide.total_reviews} size="sm" />

                    <div className="mt-4 space-y-2 text-sm text-neutral-600">
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 text-primary-500 flex-shrink-0" />
                        <span>{guide.trips_completed}+ {pageContent?.sections?.guide_card?.trips_label || "trips completed"}</span>
                      </div>
                      {guide.languages?.length > 0 && (
                        <div className="flex items-center">
                          <Globe className="h-4 w-4 mr-2 text-primary-500 flex-shrink-0" />
                          <span>{pageContent?.sections?.guide_card?.languages_label || "Languages"}: {guide.languages.slice(0, 3).join(', ')}{guide.languages.length > 3 && '...'}</span>
                        </div>
                      )}
                    </div>

                    {guide.specialties?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {guide.specialties.slice(0, 3).map((specialty, i) => (
                          <Badge key={i} tone="primary">{specialty}</Badge>
                        ))}
                        {guide.specialties.length > 3 && (
                          <Badge tone="neutral">+{guide.specialties.length - 3} more</Badge>
                        )}
                      </div>
                    )}

                    {guide.hire_price_per_day && (
                      <div className="mt-4 pt-4 border-t border-neutral-100">
                        <p className="text-lg font-bold text-primary-700">
                          ${guide.hire_price_per_day}
                          <span className="text-sm font-normal text-neutral-500">{pageContent?.sections?.guide_card?.price_label || "/day"}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Container>
      </section>
    </div>
  );
};

export default TourGuides;
