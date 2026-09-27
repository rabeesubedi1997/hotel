import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Compass, Building2, Users, Calendar } from 'lucide-react';
import { itinerariesAPI } from '../services/api';
import SEO from '../components/SEO';
import { Button, Badge, Container } from '../components/ui';

const TYPE_META = {
  hotel: { label: 'Hotel', icon: Building2 },
  activity: { label: 'Activity', icon: Compass },
  tour_guide: { label: 'Tour Guide', icon: Users },
};

const getBookableLink = (item) => {
  const slug = item.bookable?.slug;
  if (!slug) return null;
  if (item.bookable_label === 'hotel') return `/hotels/${slug}`;
  if (item.bookable_label === 'activity') return `/activities/${slug}`;
  if (item.bookable_label === 'tour_guide') return `/tour-guides/${slug}`;
  return null;
};

const getBookableImage = (item) => item.bookable?.featured_image || item.bookable?.image || null;

const getBookableName = (item) => item.bookable?.name || 'Unavailable';

const getBookableDetail = (item) => {
  const b = item.bookable;
  if (!b) return null;
  if (item.bookable_label === 'hotel') {
    const parts = [];
    if (b.city) parts.push(b.city);
    if (b.price_per_night) parts.push(`$${b.price_per_night}/night`);
    return parts.join(' · ');
  }
  if (item.bookable_label === 'activity') {
    const parts = [];
    if (b.duration) parts.push(b.duration);
    if (b.price) parts.push(`$${b.price}`);
    return parts.join(' · ');
  }
  if (item.bookable_label === 'tour_guide') {
    const parts = [];
    if (b.role) parts.push(b.role);
    if (b.hire_price_per_day) parts.push(`$${b.hire_price_per_day}/day`);
    return parts.join(' · ');
  }
  return null;
};

const ItineraryDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchItinerary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchItinerary = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const response = await itinerariesAPI.getBySlug(slug);
      setItinerary(response.data);
    } catch (error) {
      console.error('Error fetching itinerary:', error);
      setNotFound(true);
      setItinerary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = () => {
    navigate(`/checkout?mode=itinerary&slug=${slug}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (notFound || !itinerary) {
    return (
      <Container className="py-24 text-center">
        <Compass className="h-16 w-16 mx-auto text-neutral-300 mb-4" />
        <h2 className="font-display text-2xl font-bold text-neutral-900 mb-2">Itinerary not found</h2>
        <p className="text-neutral-500 mb-6">This itinerary may be unpublished or no longer available.</p>
        <Link to="/itineraries" className="text-primary-600 hover:underline font-medium">
          Browse other itineraries
        </Link>
      </Container>
    );
  }

  // Group items by day_number (already pre-sorted by the backend)
  const days = [];
  const dayMap = new Map();
  (itinerary.items || []).forEach((item) => {
    if (!dayMap.has(item.day_number)) {
      const bucket = { day_number: item.day_number, items: [] };
      dayMap.set(item.day_number, bucket);
      days.push(bucket);
    }
    dayMap.get(item.day_number).items.push(item);
  });

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      <SEO
        title={itinerary.title}
        description={itinerary.description || `A ${itinerary.duration_days}-day curated Nepal itinerary.`}
        keywords={`Nepal itinerary, ${itinerary.title}, Nepal trip planner`}
        canonical={`/itineraries/${itinerary.slug}`}
      />

      {/* Header / Banner */}
      <div className="relative bg-neutral-900 py-14 sm:py-20 overflow-hidden">
        {itinerary.cover_image && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
            style={{ backgroundImage: `url(${itinerary.cover_image})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent" />
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-primary-500/25 blur-3xl pointer-events-none" />
        <Container className="relative text-white">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {itinerary.duration_days && (
              <Badge tone="neutral" className="bg-white/90">
                <Calendar className="h-3.5 w-3.5 mr-1 inline" />
                {itinerary.duration_days} {itinerary.duration_days === 1 ? 'day' : 'days'}
              </Badge>
            )}
            {itinerary.price_from && (
              <Badge tone="accent" className="bg-white/90">
                From ${itinerary.price_from}
              </Badge>
            )}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {itinerary.title}
          </h1>
          {itinerary.description && (
            <p className="text-lg text-primary-50 max-w-2xl">
              {itinerary.description}
            </p>
          )}
        </Container>
      </div>

      <Container className="pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timeline */}
          <div className="lg:col-span-2 space-y-10">
            {days.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl shadow-card">
                <Compass className="h-12 w-12 mx-auto text-neutral-300 mb-3" />
                <p className="text-neutral-500">No day-by-day details have been added to this itinerary yet.</p>
              </div>
            ) : (
              days.map((day) => (
                <div key={day.day_number} className="relative">
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                    Day {day.day_number}
                  </h2>
                  <div className="space-y-4 border-l-2 border-primary-100 pl-5 sm:pl-6">
                    {day.items.map((item) => {
                      const meta = TYPE_META[item.bookable_label] || { label: item.bookable_label, icon: Compass };
                      const Icon = meta.icon;
                      const link = getBookableLink(item);
                      const image = getBookableImage(item);
                      const detail = getBookableDetail(item);

                      return (
                        <div
                          key={item.id}
                          className="relative bg-white rounded-2xl shadow-card border border-neutral-100 p-3 sm:p-4 flex gap-3 sm:gap-4"
                        >
                          <span className="absolute -left-[29px] sm:-left-[33px] top-5 h-3 w-3 rounded-full bg-primary-500 ring-4 ring-primary-50" />
                          <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-xl overflow-hidden bg-neutral-100 flex items-center justify-center">
                            {image ? (
                              <img src={image} alt={getBookableName(item)} className="w-full h-full object-cover" />
                            ) : (
                              <Icon className="h-8 w-8 text-neutral-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Badge tone="primary" className="inline-flex items-center gap-1">
                                <Icon className="h-3 w-3" />
                                {meta.label}
                              </Badge>
                            </div>
                            {link ? (
                              <Link
                                to={link}
                                className="font-display font-bold text-neutral-900 hover:text-primary-600 transition line-clamp-1"
                              >
                                {getBookableName(item)}
                              </Link>
                            ) : (
                              <p className="font-display font-bold text-neutral-900 line-clamp-1">
                                {getBookableName(item)}
                              </p>
                            )}
                            {detail && (
                              <p className="text-sm text-neutral-500 mt-0.5">{detail}</p>
                            )}
                            {item.notes && (
                              <p className="text-sm text-neutral-600 mt-2 italic">{item.notes}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Booking CTA sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-card border border-neutral-100 p-6 sticky top-24">
              <h3 className="font-display text-lg font-bold text-neutral-900 mb-2">Ready to go?</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Book this entire itinerary — hotels, activities, and guides — in one seamless trip.
              </p>
              {itinerary.fixed_price ? (
                <div className="mb-4">
                  <span className="text-2xl font-bold text-primary-600">${itinerary.fixed_price}</span>
                  <span className="text-sm text-neutral-500"> / traveler</span>
                </div>
              ) : itinerary.price_from ? (
                <div className="mb-4">
                  <span className="text-2xl font-bold text-primary-600">${itinerary.price_from}</span>
                  <span className="text-sm text-neutral-500"> from / person</span>
                </div>
              ) : null}
              <Button variant="accent" size="lg" fullWidth onClick={handleBookNow}>
                Book this itinerary
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default ItineraryDetails;
