import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mountain,
  Compass,
  Star,
  MapPin,
  Sparkles,
  Heart,
  Clock,
  Users,
  Building2,
  MessageSquare,
  FileText,
  Route,
} from 'lucide-react';
import { hotelsAPI, activitiesAPI, publicAPI, wishlistsAPI } from '../services/api';
import useAuthStore from '../stores/authStore';
import { getHotelImage, getActivityImage, getAdventureBanner } from '../utils/images';
import SEO from '../components/SEO';
import PromotionSlot from '../components/PromotionSlot';
import SearchWidget from '../components/SearchWidget';
import DestinationShortcuts from '../components/DestinationShortcuts';
import TrustStrip from '../components/TrustStrip';
import useCurrencyStore from '../stores/currencyStore';
import { Button, Card, Badge, Container, CardGridSkeleton } from '../components/ui';
import { loginUrl } from '../utils/loginRedirect';

const DIFFICULTY_TONE = { easy: 'success', moderate: 'warning', challenging: 'accent', extreme: 'danger' };

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const formatPrice = useCurrencyStore((s) => s.formatPrice);
  const [hotels, setHotels] = useState([]);
  const [activities, setActivities] = useState([]);
  const [bannerIds, setBannerIds] = useState(new Set()); // "hotel:3" / "activity:7" — items in the admin-curated banner rotation, shown first + tagged "Featured"
  const [bannerSlides, setBannerSlides] = useState([]); // ordered background images for the hero slider, from Admin > Banner Management
  const [activeSlide, setActiveSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageContent, setPageContent] = useState(null);
  const [stats, setStats] = useState({ hotels: 0, activities: 0, cities: 0 });
  const [wishlisted, setWishlisted] = useState(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          hotelsRes,
          activitiesRes,
          bannerHotelsRes,
          bannerActivitiesRes,
          hotelCitiesRes,
          activityCitiesRes,
          pageRes,
        ] = await Promise.all([
          hotelsAPI.getFeatured(),
          activitiesAPI.getFeatured(),
          hotelsAPI.getBannerItems().catch(() => ({ data: [] })),
          activitiesAPI.getBannerItems().catch(() => ({ data: [] })),
          hotelsAPI.getCities().catch(() => ({ data: [] })),
          activitiesAPI.getCities().catch(() => ({ data: [] })),
          publicAPI.getPage('home').catch(() => ({ data: null })),
        ]);

        setHotels(hotelsRes.data || []);
        setActivities(activitiesRes.data || []);
        setPageContent(pageRes.data);

        const banner = new Set([
          ...(bannerHotelsRes.data || []).map((h) => `hotel:${h.id}`),
          ...(bannerActivitiesRes.data || []).map((a) => `activity:${a.id}`),
        ]);
        setBannerIds(banner);

        // Same admin-curated items, but as an ordered list of images for the
        // hero slider (Admin > Banner Management controls this selection
        // and order — see BannerManagement.jsx).
        const slides = [
          ...(bannerHotelsRes.data || []).map((h) => ({
            image: h.featured_image || getHotelImage(h.id),
            order: h.banner_order || 0,
          })),
          ...(bannerActivitiesRes.data || []).map((a) => ({
            image: a.featured_image || getActivityImage(a.type),
            order: a.banner_order || 0,
          })),
        ]
          .sort((a, b) => a.order - b.order)
          .map((s) => s.image);
        setBannerSlides(slides);

        const cities = new Set([...(hotelCitiesRes.data || []), ...(activityCitiesRes.data || [])]);
        setStats({
          hotels: (hotelsRes.data || []).length,
          activities: (activitiesRes.data || []).length,
          cities: cities.size,
        });
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-advance the hero background slider (only when there's more than
  // one admin-curated banner image to cycle through).
  useEffect(() => {
    if (bannerSlides.length < 2) return undefined;
    const timer = setInterval(() => {
      setActiveSlide((i) => (i + 1) % bannerSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [bannerSlides.length]);

  // Combine hotels + activities into one feed, banner-curated items first —
  // this keeps the admin Banner Management page meaningful (it controls
  // which listings surface here as "Featured", and drives the hero slider
  // background below).
  const items = useMemo(() => {
    const hotelItems = hotels.map((h) => ({ ...h, item_type: 'hotel' }));
    const activityItems = activities.map((a) => ({ ...a, item_type: 'activity' }));
    const combined = [...hotelItems, ...activityItems];
    combined.sort((a, b) => {
      const aBanner = bannerIds.has(`${a.item_type}:${a.id}`) ? 0 : 1;
      const bBanner = bannerIds.has(`${b.item_type}:${b.id}`) ? 0 : 1;
      return aBanner - bBanner;
    });
    return combined;
  }, [hotels, activities, bannerIds]);

  const toggleWishlist = async (item, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate(loginUrl());
      return;
    }
    const key = `${item.item_type}:${item.id}`;
    if (wishlisted.has(key)) return;
    try {
      await wishlistsAPI.add({ wishlistable_type: item.item_type, wishlistable_id: item.id });
      setWishlisted((prev) => new Set(prev).add(key));
    } catch (error) {
      console.error('Error adding to wishlist:', error);
    }
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="Home"
        description="Discover luxury hotels and thrilling adventures in Nepal. Book your perfect stay or exciting activities today."
        keywords="Nepal hotels, Nepal adventures, trekking, hotels in Kathmandu, activities Nepal, book hotel Nepal"
        canonical="/"
      />
      {/* Atmospheric hero — background is either the Pages Management hero
          image (default) or, when Admin > Banner Management has items
          toggled on, an auto-advancing crossfade slider through them. Text
          stays the same either way. */}
      <section className="relative bg-neutral-900 overflow-hidden pt-10 pb-16 sm:pt-14 sm:pb-24">
        {(bannerSlides.length > 0
          ? bannerSlides
          : [pageContent?.sections?.hero?.background_image || getAdventureBanner()]
        ).map((image, index) => (
          <div
            key={image + index}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
            style={{ backgroundImage: `url(${image})`, opacity: index === activeSlide ? 1 : 0 }}
          />
        ))}
        {/* Darkest over the text (left), fading out toward the right so the photo actually reads */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 via-neutral-900/80 to-neutral-900/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/30 to-transparent" />
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />

        <Container className="relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-sm mb-6">
            <Sparkles className="h-4 w-4 text-primary-300" />
            <span className="font-label-caps text-label-caps text-white uppercase tracking-widest">
              {pageContent?.sections?.hero?.eyebrow || 'Curated Nepal Travel Catalog'}
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-bold text-white max-w-3xl leading-tight">
            {pageContent?.sections?.hero?.title || 'Discover Nepal — Hotels & Adventures.'}
          </h1>
          <p className="text-neutral-300 text-base sm:text-lg max-w-2xl mt-4 leading-relaxed">
            {pageContent?.sections?.hero?.subtitle ||
              'Handpicked hotels and adrenaline-fueled adventures across Nepal — from Kathmandu heritage stays to Himalayan treks and white-water rapids.'}
          </p>

          <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-10 pt-6 bg-white/5 backdrop-blur-sm rounded-2xl p-5 sm:p-6 max-w-2xl">
            <div>
              <span className="font-display text-2xl sm:text-3xl font-bold text-white block">{stats.hotels}+</span>
              <span className="text-xs sm:text-sm text-neutral-300 uppercase tracking-wide">Hotels & Stays</span>
            </div>
            <div>
              <span className="font-display text-2xl sm:text-3xl font-bold text-primary-300 block">{stats.activities}+</span>
              <span className="text-xs sm:text-sm text-neutral-300 uppercase tracking-wide">Adventures</span>
            </div>
            <div>
              <span className="font-display text-2xl sm:text-3xl font-bold text-white block">{stats.cities}</span>
              <span className="text-xs sm:text-sm text-neutral-300 uppercase tracking-wide">Cities Covered</span>
            </div>
          </div>
        </Container>

        {bannerSlides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            {bannerSlides.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveSlide(index)}
                aria-label={`Show slide ${index + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  index === activeSlide ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Hero search widget — overlaps the hero, tabbed Hotels/Activities/Packages */}
      <div className="relative z-20 -mt-8 sm:-mt-10">
        <Container>
          <SearchWidget />
        </Container>
      </div>

      {/* Main advertisement banner — a big rotating carousel admins fill via
          Admin > Promotions (placement: home_hero). Renders nothing until at
          least one active promotion exists for this slot. */}
      <Container className="pt-10">
        <PromotionSlot placement="home_hero" variant="carousel" />
      </Container>

      {/* Quick category shortcuts — one click to any product type */}
      <Container className="pt-10">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
          {[
            { icon: Building2, label: 'Hotels', to: '/hotels' },
            { icon: Compass, label: 'Activities', to: '/activities' },
            { icon: Users, label: 'Tour Guides', to: '/tour-guides' },
            { icon: Route, label: 'Packages', to: '/itineraries' },
            { icon: Mountain, label: 'Trip Planner', to: '/trip-planner' },
            { icon: MessageSquare, label: 'Get a Quote', to: '/quote' },
          ].map((cat) => (
            <Link
              key={cat.label}
              to={cat.to}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-neutral-100 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all text-center"
            >
              <span className="h-11 w-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                <cat.icon className="h-5 w-5" />
              </span>
              <span className="font-medium text-xs sm:text-sm text-neutral-800">{cat.label}</span>
            </Link>
          ))}
        </div>
      </Container>

      {/* Popular destinations — real cities pulled from live hotel listings,
          each tagged with its cheapest current price. */}
      <Container className="pt-10">
        <DestinationShortcuts type="hotels" title="Popular Destinations" />
      </Container>

      {/* Trust badges — admin-editable via Pages > Home > Trust Badges.
          Only renders badges that actually have a title, so nothing
          placeholder-looking ever reaches real visitors before they're set. */}
      <Container className="pt-10">
        <TrustStrip badges={pageContent?.sections?.trust_badges} />
      </Container>

      <Container className="pt-10">
        <PromotionSlot placement="home_strip" />
      </Container>

      {/* Featured grid */}
      <section className="pt-8 pb-16 sm:pt-10 sm:pb-20 bg-white">
        <Container>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-neutral-900">Featured Stays &amp; Adventures</h2>
              <p className="text-sm text-neutral-500 mt-0.5">
                {loading ? 'Loading...' : `${items.length} handpicked picks across Nepal`}
              </p>
            </div>
          </div>

          {loading ? (
            <CardGridSkeleton count={6} gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" />
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">Nothing to show yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item, index) => {
                const isHotel = item.item_type === 'hotel';
                const image = item.featured_image || (isHotel ? getHotelImage(item.id || index) : getActivityImage(item.type));
                const link = isHotel ? `/hotels/${item.slug}` : `/activities/${item.slug}`;
                const isFeatured = bannerIds.has(`${item.item_type}:${item.id}`);
                const isWishlisted = wishlisted.has(`${item.item_type}:${item.id}`);

                return (
                  <Card key={`${item.item_type}-${item.id}`} as={Link} to={link} className="flex flex-col">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                        {isHotel ? (
                          <Badge tone="primary">{item.star_rating}-Star</Badge>
                        ) : (
                          <Badge tone={DIFFICULTY_TONE[item.difficulty_level] || 'neutral'} className="capitalize">{item.difficulty_level}</Badge>
                        )}
                        {isFeatured && <Badge tone="accent">Featured</Badge>}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => toggleWishlist(item, e)}
                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition"
                        aria-label="Save to wishlist"
                      >
                        <Heart className={`h-4 w-4 ${isWishlisted ? 'text-accent-600 fill-accent-600' : 'text-neutral-600'}`} />
                      </button>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center justify-between text-xs text-neutral-500 mb-1.5">
                        <span className="flex items-center gap-1 text-primary-600 font-medium">
                          <MapPin className="h-3.5 w-3.5" />
                          {item.city || item.location}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-neutral-800">
                          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                          {item.rating || '4.5'}
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-bold text-neutral-900 group-hover:text-primary-600 transition line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="text-sm text-neutral-500 mt-1.5 line-clamp-2">
                        {item.description || (isHotel ? `${item.star_rating}-star comfort in ${item.city}.` : `A ${item.difficulty_level} ${item.type} experience in ${item.location}.`)}
                      </p>

                      <div className="flex items-center gap-2 mt-3 text-xs text-neutral-600">
                        {isHotel ? (
                          <>
                            <span className="flex items-center gap-1 bg-neutral-100 px-2 py-1 rounded-md">
                              <Building2 className="h-3.5 w-3.5" /> {item.amenities?.length || 0} amenities
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="flex items-center gap-1 bg-neutral-100 px-2 py-1 rounded-md">
                              <Clock className="h-3.5 w-3.5" /> {item.duration}
                            </span>
                            <span className="flex items-center gap-1 bg-neutral-100 px-2 py-1 rounded-md">
                              <Users className="h-3.5 w-3.5" /> Max {item.max_participants}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="mt-auto pt-4 flex items-center justify-between border-t border-neutral-100 mt-4">
                        <div>
                          <span className="font-price-display text-price-display font-bold text-neutral-900">
                            {formatPrice(isHotel ? item.price_per_night : item.price)}
                          </span>
                          <span className="text-xs text-neutral-500"> {isHotel ? '/night' : '/person'}</span>
                        </div>
                        <Button as="span" variant={isHotel ? 'primary' : 'info'} size="sm">
                          {isHotel ? 'Reserve Now' : 'Reserve Spot'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Button as={Link} to="/hotels" variant="secondary">
              <Building2 className="h-4 w-4" /> View All Hotels
            </Button>
            <Button as={Link} to="/activities" variant="secondary">
              <Compass className="h-4 w-4" /> View All Activities
            </Button>
          </div>
        </Container>
      </section>

      {/* Trip Planner promo — self-service itinerary builder none of the
          competitor sites offer (they're all quote/contact-based only) */}
      <section className="pb-16 sm:pb-20">
        <Container>
          <div className="relative bg-gradient-to-br from-primary-700 to-primary-900 rounded-3xl p-8 lg:p-12 overflow-hidden text-white">
            <div className="absolute -left-16 -bottom-16 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative grid lg:grid-cols-[1.1fr,1fr] gap-10 items-center">
              <div>
                <span className="font-label-caps text-label-caps text-primary-200 uppercase tracking-wider">Plan It Yourself</span>
                <h3 className="font-headline-md text-headline-md font-bold text-white mt-1">
                  Build your own Nepal itinerary in minutes
                </h3>
                <p className="text-primary-100 mt-3 max-w-lg">
                  Mix hotels, activities, and tour guides into one trip, day by day — save it, share it, and book
                  everything from a single plan. No waiting on a quote.
                </p>
                <Button as={Link} to="/trip-planner" variant="secondary" pill className="mt-6">
                  <Route className="h-4 w-4" /> Start Planning Free
                </Button>
              </div>
              <div className="grid gap-3">
                {[
                  { icon: Building2, label: 'Pick your hotels & stays' },
                  { icon: Compass, label: 'Add activities & tour guides' },
                  { icon: Route, label: 'Save your day-by-day itinerary' },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4">
                    <span className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                      <step.icon className="h-5 w-5 text-primary-200" />
                    </span>
                    <span className="font-medium text-white">{step.label}</span>
                    <span className="ml-auto text-2xl font-display font-bold text-white/30">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Concierge CTA — a photo backdrop instead of the same flat dark
          panel the footer below already uses, so the two sections don't
          blur into one another. */}
      <section className="pb-16 sm:pb-20">
        <Container>
          <div
            className="relative rounded-3xl p-8 lg:p-14 overflow-hidden text-white bg-neutral-900 bg-cover bg-center"
            style={{ backgroundImage: `linear-gradient(115deg, rgba(10,15,13,0.94) 0%, rgba(10,15,13,0.78) 45%, rgba(10,15,13,0.55) 100%), url(${getAdventureBanner()})` }}
          >
            <div className="absolute right-0 top-0 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col gap-10">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                <div className="flex items-start sm:items-center gap-5 max-w-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 ring-1 ring-white/15">
                    <Mountain className="h-8 w-8 text-primary-300" />
                  </div>
                  <div>
                    <span className="font-label-caps text-label-caps text-primary-300 uppercase tracking-wider">Bespoke Trip Planning</span>
                    <h3 className="font-headline-md text-headline-md font-bold text-white mt-1">Need a custom trip?</h3>
                    <p className="text-neutral-200 mt-2 max-w-xl">
                      Tell our concierge team your dates, budget, and interests — we'll help you build a custom itinerary across hotels, activities, and guides.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
                  <Button as={Link} to="/contact" variant="info" pill>
                    <MessageSquare className="h-4 w-4" /> Talk to Concierge
                  </Button>
                  <Button as={Link} to="/quote" variant="primary" pill>
                    <FileText className="h-4 w-4" /> Get a Custom Quote
                  </Button>
                </div>
              </div>

              {/* Trust stats — gives the card weight and a reason to trust
                  the concierge promise, instead of ending on a bare button row. */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-white/15">
                {[
                  { icon: Clock, label: 'Avg. reply time', value: 'Under 2 hrs' },
                  { icon: Users, label: 'Trips planned', value: '1,200+' },
                  { icon: Star, label: 'Traveler rating', value: '4.8 / 5' },
                  { icon: Sparkles, label: 'Custom itineraries', value: '100% free' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <stat.icon className="h-5 w-5 text-primary-300" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-white leading-none truncate">{stat.value}</p>
                      <p className="text-xs text-neutral-300 mt-1 truncate">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default Home;
