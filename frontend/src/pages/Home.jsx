import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hotel, Compass, Star, MapPin, ArrowRight, Sparkles, Shield, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { hotelsAPI, activitiesAPI, publicAPI } from '../services/api';
import { getHotelImage, getActivityImage, getAdventureBanner } from '../utils/images';
import SEO from '../components/SEO';

const Home = () => {
  const [featuredHotels, setFeaturedHotels] = useState([]);
  const [featuredActivities, setFeaturedActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ hotels: 6, activities: 9, bookings: 500 });
  const [pageContent, setPageContent] = useState(null);
  
  // Banner slider state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [bannerItems, setBannerItems] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hotelsRes, activitiesRes, bannerHotelsRes, bannerActivitiesRes, pageRes] = await Promise.all([
          hotelsAPI.getFeatured(),
          activitiesAPI.getFeatured(),
          hotelsAPI.getBannerItems().catch(() => ({ data: [] })),
          activitiesAPI.getBannerItems().catch(() => ({ data: [] })),
          publicAPI.getPage('home').catch(() => ({ data: null })),
        ]);
        setFeaturedHotels(hotelsRes.data || []);
        setFeaturedActivities(activitiesRes.data || []);
        setPageContent(pageRes.data);
        
        // Combine banner items from both hotels and activities, sorted by banner_order
        const bannerHotels = (bannerHotelsRes.data || []).map(h => ({ ...h, item_type: 'hotel' }));
        const bannerActivities = (bannerActivitiesRes.data || []).map(a => ({ ...a, item_type: 'activity' }));
        const combined = [...bannerHotels, ...bannerActivities]
          .sort((a, b) => (a.banner_order || 0) - (b.banner_order || 0))
          .slice(0, 5);
        setBannerItems(combined);
      } catch (error) {
        console.error('Error fetching featured items:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-rotate slides
  useEffect(() => {
    if (bannerItems.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerItems.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [bannerItems.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % bannerItems.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + bannerItems.length) % bannerItems.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <div className="min-h-screen">
      <SEO 
        title="Home" 
        description="Discover luxury hotels and thrilling adventures in Nepal. Book your perfect stay or exciting activities today."
        keywords="Nepal hotels, Nepal adventures, trekking, hotels in Kathmandu, activities Nepal, book hotel Nepal"
        canonical="/"
      />
      {/* Banner Slider Section */}
      <section className="relative h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden">
        {bannerItems.length > 0 ? (
          <>
            {/* Slides */}
            {bannerItems.map((item, index) => {
              const isHotel = item.item_type === 'hotel';
              const image = item.featured_image || (isHotel ? getHotelImage(item.id) : getActivityImage(item.type));
              const link = isHotel ? `/hotels/${item.slug}` : `/activities/${item.slug}`;
              const location = item.city || item.location;
              
              return (
                <div
                  key={item.id}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
                >
                  {/* Background Image with Overlay */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${image})` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-20 h-full flex items-center">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                      <div className="max-w-2xl">
                        {/* Badge */}
                        <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-4 md:mb-6">
                          <Sparkles className="h-4 w-4 mr-2 text-yellow-300" />
                          <span className="text-sm font-medium text-white">
                            {isHotel ? 'Featured Hotel' : 'Featured Adventure'}
                          </span>
                        </div>
                        
                        {/* Title */}
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                          {item.name}
                        </h1>
                        
                        {/* Location */}
                        <div className="flex items-center text-gray-200 mb-4 md:mb-6">
                          <MapPin className="h-5 w-5 mr-2" />
                          <span className="text-lg">{location}</span>
                        </div>
                        
                        {/* Description */}
                        <p className="text-gray-200 text-base md:text-lg mb-6 md:mb-8 line-clamp-2 md:line-clamp-3">
                          {item.description || `Experience the best of Nepal at ${item.name}. Book now for an unforgettable experience.`}
                        </p>
                        
                        {/* CTA Button */}
                        <Link 
                          to={link}
                          className="inline-flex items-center bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-base md:text-lg transition shadow-lg hover:shadow-xl"
                        >
                          <Hotel className="mr-2 h-5 w-5" />
                          Book Now
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-30 p-1.5 md:p-2 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full transition"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-30 p-1.5 md:p-2 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full transition"
              aria-label="Next slide"
            >
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </button>

            {/* Slider Loader Navigation */}
            <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2 md:gap-6 max-w-[90%] md:max-w-none overflow-x-auto">
              {bannerItems.map((item, index) => (
                <div
                  key={index}
                  onClick={() => goToSlide(index)}
                  className="cursor-pointer w-8 md:w-24 flex-shrink-0"
                >
                  {/* Label - Hidden on mobile */}
                  <p className="hidden md:block text-white text-sm mb-1 truncate">
                    {item.name}
                  </p>

                  {/* Line Bar */}
                  <div className="h-1 md:h-[2px] bg-white/30 relative overflow-hidden rounded-full">
                    <div
                      className={`absolute top-0 left-0 h-full bg-orange-400 transition-all duration-500 ${index === currentSlide ? 'w-full' : 'w-0'
                        }`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Slide Counter - Hidden on mobile */}
            <div className="hidden md:block absolute bottom-6 right-4 md:right-8 z-30 text-white text-sm">
              <span className="font-bold">{currentSlide + 1}</span>
              <span className="mx-2">/</span>
              <span>{bannerItems.length}</span>
            </div>
          </>
        ) : (
          // Fallback when no featured items
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">Discover Nepal</h1>
              <p className="text-xl md:text-2xl mb-8">Luxury hotels and thrilling adventures await</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/hotels" className="inline-flex items-center justify-center bg-white text-blue-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition shadow-lg">
                  <Hotel className="mr-2 h-5 w-5" />
                  Browse Hotels
                </Link>
                <Link to="/activities" className="inline-flex items-center justify-center bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition">
                  <Compass className="mr-2 h-5 w-5" />
                  Explore Activities
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Trust Badges */}
      <section className="bg-white py-8 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(pageContent?.sections?.trust_badges || [
              { icon: 'shield', title: 'Secure Booking', subtitle: '100% secure payment' },
              { icon: 'clock', title: '24/7 Support', subtitle: 'Always here to help' },
              { icon: 'star', title: 'Best Price Guarantee', subtitle: 'Lowest rates guaranteed' },
            ]).map((badge, index) => (
              <div key={index} className="flex items-center justify-center space-x-3 text-gray-700">
                {badge.icon === 'shield' && <Shield className="h-8 w-8 text-green-500" />}
                {badge.icon === 'clock' && <Clock className="h-8 w-8 text-blue-500" />}
                {badge.icon === 'star' && <Star className="h-8 w-8 text-yellow-500" />}
                <div>
                  <p className="font-semibold">{badge.title}</p>
                  <p className="text-sm text-gray-500">{badge.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Hotels */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-primary-600 font-semibold uppercase text-sm">
              {pageContent?.sections?.hotels_section?.subtitle || 'Premium Stays'}
            </span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2">
              {pageContent?.sections?.hotels_section?.title || 'Featured Hotels'}
            </h2>
            <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
              {pageContent?.sections?.hotels_section?.description || "Experience luxury and comfort at Nepal's finest hotels"}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredHotels.slice(0, 6).map((hotel, index) => (
                <Link key={hotel.id} to={`/hotels/${hotel.slug}`} className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="relative h-56 overflow-hidden">
                    <img src={hotel.featured_image || getHotelImage(index)} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="ml-1 text-sm font-semibold">{hotel.rating || '4.5'}</span>
                      </div>
                    </div>
                    {hotel.is_featured && (
                      <div className="absolute top-4 left-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        Featured
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center text-gray-500 text-sm mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      {hotel.city}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition">{hotel.name}</h3>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div>
                        <span className="text-2xl font-bold text-primary-600">${hotel.price_per_night}</span>
                        <span className="text-gray-500 text-sm">/night</span>
                      </div>
                      <span className="text-sm text-gray-500">{hotel.star_rating} Star</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="text-center mt-12">
            <Link to={pageContent?.sections?.hotels_section?.button_link || '/hotels'} className="inline-flex items-center text-primary-600 font-semibold hover:text-primary-700 transition">
              {pageContent?.sections?.hotels_section?.button_text || 'View All Hotels'} <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Adventure Banner */}
      <section className="relative py-24 bg-gradient-to-r from-green-800 to-blue-800">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20" 
          style={{ 
            backgroundImage: `url(${pageContent?.sections?.adventure_banner?.background_image || getAdventureBanner()})` 
          }}
        ></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {pageContent?.sections?.adventure_banner?.title || 'Ready for Adventure?'}
          </h2>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            {pageContent?.sections?.adventure_banner?.description || "From bungee jumping to paragliding, experience the thrill of Nepal's most exciting activities"}
          </p>
          <Link 
            to={pageContent?.sections?.adventure_banner?.button_link || '/activities'} 
            className="inline-flex items-center bg-white text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition"
          >
            <Compass className="mr-2 h-5 w-5" />
            {pageContent?.sections?.adventure_banner?.button_text || 'Explore Activities'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Featured Activities */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-primary-600 font-semibold uppercase text-sm">
              {pageContent?.sections?.activities_section?.subtitle || 'Thrilling Experiences'}
            </span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2">
              {pageContent?.sections?.activities_section?.title || 'Featured Adventures'}
            </h2>
            <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
              {pageContent?.sections?.activities_section?.description || 'Push your limits with our curated selection of activities'}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredActivities.slice(0, 6).map((activity, index) => (
                <Link key={activity.id} to={`/activities/${activity.slug}`} className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
                  <div className="relative h-48 overflow-hidden">
                    <img src={activity.featured_image || getActivityImage(activity.type)} alt={activity.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <span className="text-white text-sm font-medium uppercase tracking-wide">{activity.type}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition">{activity.name}</h3>
                    <div className="flex items-center text-gray-500 text-sm mt-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      {activity.location}
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div>
                        <span className="text-2xl font-bold text-primary-600">${activity.price}</span>
                        <span className="text-gray-500 text-sm">/person</span>
                      </div>
                      <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">{activity.duration}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="text-center mt-12">
            <Link to={pageContent?.sections?.activities_section?.button_link || '/activities'} className="inline-flex items-center text-primary-600 font-semibold hover:text-primary-700 transition">
              {pageContent?.sections?.activities_section?.button_text || 'View All Activities'} <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {pageContent?.sections?.newsletter?.title || 'Get Exclusive Deals'}
          </h2>
          <p className="text-lg text-gray-100 mb-8">
            {pageContent?.sections?.newsletter?.description || 'Subscribe to receive special offers on hotels and activities'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
            <input 
              type="email" 
              placeholder={pageContent?.sections?.newsletter?.placeholder || 'Enter your email'} 
              className="flex-1 px-6 py-4 rounded-xl text-gray-900 focus:outline-none" 
            />
            <button className="px-8 py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition">
              {pageContent?.sections?.newsletter?.button_text || 'Subscribe'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
