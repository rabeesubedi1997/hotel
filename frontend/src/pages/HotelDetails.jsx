// Cache bust: 2025-04-07-12-54-00 - All imports fixed including bookingsAPI
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  MapPin,
  Calendar,
  Users,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
  Send,
  Plus,
  Minus,
  Image as ImageIcon,
  X,
  MessageSquare,
  Star,
  Building2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
// Fixed Upload import - cache refresh
import { hotelsAPI, activitiesAPI, reviewsAPI, wishlistsAPI, bookingsAPI } from '../services/api';
import useAuthStore from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import { useToast } from '../contexts/ToastContext';
import BookingCalendar from '../components/BookingCalendar';
import { getHotelImage, getActivityImage } from '../utils/images';
import ExternalRatings from '../components/ExternalRatings';
import SEO, { generateHotelJsonLd } from '../components/SEO';
import { Button, Textarea, Select, Card, RatingStars, Container, WishlistButton } from '../components/ui';
import AddToTripButton from '../components/AddToTripButton';
import useCurrencyStore from '../stores/currencyStore';
import useSearchStore, { toYmd } from '../stores/searchStore';

const HotelDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { startConversation } = useChatStore();
  const toast = useToast();
  const formatPrice = useCurrencyStore((s) => s.formatPrice);
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagingHost, setMessagingHost] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistId, setWishlistId] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: '',
    photos: [],
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Booking form state — prefilled from the homepage search so guests
  // aren't asked for the same dates twice.
  const { getHotelSearch, setHotelSearch } = useSearchStore();
  const [savedSearch] = useState(getHotelSearch);
  const [checkInDate, setCheckInDate] = useState(savedSearch.checkIn);
  const [checkOutDate, setCheckOutDate] = useState(savedSearch.checkOut);
  const [adults, setAdults] = useState(Math.max(1, Number(savedSearch.guests) || 1));

  useEffect(() => {
    setHotelSearch({ checkIn: toYmd(checkInDate), checkOut: toYmd(checkOutDate), guests: adults });
  }, [checkInDate, checkOutDate, adults]);
  const [children, setChildren] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [displayImages, setDisplayImages] = useState([]);
  const [displayAmenities, setDisplayAmenities] = useState([]);
  const [imageTransitioning, setImageTransitioning] = useState(false);

  // "Enhance your stay" add-ons — local activities a guest can attach to
  // this hotel booking (see BookingExtra on the backend).
  const [nearbyActivities, setNearbyActivities] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState({}); // { [activityId]: quantity }

  // Photo gallery lightbox state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    fetchHotel();
  }, [slug]);

  // Update display content when room is selected
  useEffect(() => {
    if (hotel) {
      // Add transition effect
      setImageTransitioning(true);

      setTimeout(() => {
        if (selectedRoom) {
          // Show room-specific content
          setDisplayImages(selectedRoom.images || hotel.images || []);
          setDisplayAmenities(selectedRoom.amenities || hotel.amenities || []);
        } else {
          // Show hotel-wide content
          setDisplayImages(hotel.images || []);
          setDisplayAmenities(hotel.amenities || []);
        }
        setImageTransitioning(false);
      }, 200); // Small delay for smooth transition
    }
  }, [selectedRoom, hotel]);

  const fetchHotel = async () => {
    setLoading(true);
    try {
      const response = await hotelsAPI.getBySlug(slug);
      setHotel(response.data);
      if (isAuthenticated) {
        checkWishlist(response.data.id);
      }
      fetchNearbyActivities(response.data);
    } catch (error) {
      console.error('Error fetching hotel:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyActivities = async (hotelData) => {
    try {
      const params = hotelData.latitude && hotelData.longitude
        ? { lat: hotelData.latitude, lng: hotelData.longitude, radius: 30, per_page: 6 }
        : { city: hotelData.city, per_page: 6 };
      const response = await activitiesAPI.getAll(params);
      setNearbyActivities(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching nearby activities:', error);
    }
  };

  const extraQuantity = (activityId) => selectedExtras[activityId] || 0;

  const setExtraQuantity = (activityId, quantity) => {
    setSelectedExtras((prev) => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[activityId];
      } else {
        next[activityId] = quantity;
      }
      return next;
    });
  };

  const calculateExtrasTotal = () => {
    return nearbyActivities.reduce((sum, activity) => {
      const qty = extraQuantity(activity.id);
      return qty > 0 ? sum + qty * activity.price : sum;
    }, 0);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setSubmittingReview(true);
    try {
      // Use FormData for file uploads
      const formData = new FormData();
      formData.append('reviewable_type', 'hotel');
      formData.append('reviewable_id', hotel.id);
      formData.append('rating', reviewForm.rating);
      formData.append('comment', reviewForm.comment);

      // Add photos
      if (reviewForm.photos && reviewForm.photos.length > 0) {
        reviewForm.photos.forEach((photo) => {
          formData.append('images[]', photo);
        });
      }

      await reviewsAPI.create(formData);
      setReviewForm({ rating: 0, comment: '', photos: [] });
      fetchHotel();
      alert('Review submitted successfully! It will appear after admin approval.');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const checkWishlist = async (hotelId) => {
    try {
      const response = await wishlistsAPI.check({
        wishlistable_type: 'hotel',
        wishlistable_id: hotelId,
      });
      setInWishlist(response.data.in_wishlist);
      setWishlistId(response.data.wishlist_id || null);
    } catch (error) {
      console.error('Error checking wishlist:', error);
    }
  };

  const toggleWishlist = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      if (inWishlist && wishlistId) {
        await wishlistsAPI.remove(wishlistId);
        setInWishlist(false);
        setWishlistId(null);
      } else {
        const response = await wishlistsAPI.add({
          wishlistable_type: 'hotel',
          wishlistable_id: hotel.id,
        });
        setInWishlist(true);
        setWishlistId(response.data.wishlist?.id);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  };

  const handleMessageHost = async () => {
    if (!isAuthenticated) {
      toast.info('Please log in to message the host.');
      navigate('/login');
      return;
    }
    setMessagingHost(true);
    const result = await startConversation({
      type: 'vendor_inquiry',
      vendor_id: hotel.user.id,
      subject_type: 'hotel',
      subject_id: hotel.id,
      message: "Hi, I'm interested in this listing.",
    });
    setMessagingHost(false);
    if (result.success) {
      navigate(`/messages/${result.conversation.id}`);
    } else {
      toast.error(result.error);
    }
  };

  // Calculate total nights between dates
  const calculateNights = () => {
    if (checkInDate && checkOutDate) {
      const diffTime = checkOutDate.getTime() - checkInDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    }
    return 0;
  };

  // Calculate total price
  const calculateTotalPrice = () => {
    const nights = calculateNights();
    const roomPrice = selectedRoom ? selectedRoom.price : hotel?.price_per_night;
    const totalGuests = adults + children;
    return nights * roomPrice * totalGuests;
  };

  // Check availability
  const checkAvailability = async () => {
    if (!checkInDate || !checkOutDate) {
      setAvailabilityStatus({ available: false, message: 'Please select check-in and check-out dates' });
      return;
    }

    setCheckingAvailability(true);
    try {
      const response = await bookingsAPI.checkAvailability({
        bookable_type: 'hotel',
        bookable_id: hotel.id,
        check_in_date: toYmd(checkInDate),
        check_out_date: toYmd(checkOutDate),
        guests: adults + children,
        room_id: selectedRoom?.id,
      });

      setAvailabilityStatus(response.data);
      if (response.data.available) {
        setTotalPrice(calculateTotalPrice());
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      setAvailabilityStatus({ available: false, message: 'Error checking availability' });
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Handle proceed to checkout
  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!availabilityStatus?.available) {
      checkAvailability();
      return;
    }

    // Check if room is selected
    if (!selectedRoom) {
      toast.warning('Please select a room type before proceeding to booking.');
      return;
    }

    const bookingData = {
      type: 'hotel',
      id: hotel.slug,
      hotel_id: hotel.id,
      check_in: checkInDate.getFullYear() + '-' + String(checkInDate.getMonth() + 1).padStart(2, '0') + '-' + String(checkInDate.getDate()).padStart(2, '0'),
      check_out: checkOutDate.getFullYear() + '-' + String(checkOutDate.getMonth() + 1).padStart(2, '0') + '-' + String(checkOutDate.getDate()).padStart(2, '0'),
      adults,
      children,
      room_id: selectedRoom?.id,
      nights: calculateNights(),
      total_price: calculateTotalPrice() + calculateExtrasTotal(),
      extras: Object.entries(selectedExtras)
        .filter(([, quantity]) => quantity > 0)
        .map(([activity_id, quantity]) => ({ activity_id: Number(activity_id), quantity })),
    };

    // Store booking data in session storage for checkout page
    console.log('Storing booking data:', bookingData);
    sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
    console.log('Stored in sessionStorage, navigating to checkout');
    navigate('/checkout?type=hotel&id=' + hotel.slug);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <Container className="py-8 text-center">
        <h2 className="text-2xl font-bold text-neutral-900">Hotel not found</h2>
        <Link to="/hotels" className="text-primary-600 mt-4 inline-block">
          Browse other hotels
        </Link>
      </Container>
    );
  }

  // Gallery images: prefer room-aware displayImages, fall back to generated stock photos
  const galleryImages = displayImages.length > 0
    ? displayImages
    : [
        hotel.featured_image || getHotelImage(hotel.id),
        getHotelImage(hotel.id + 1),
        getHotelImage(hotel.id + 2),
        getHotelImage(hotel.id + 3),
        getHotelImage(hotel.id + 4),
      ];
  const mainImage = galleryImages[0];
  const thumbnailImages = galleryImages.slice(1, 5);

  const openGallery = (index = 0) => {
    setActiveImage(index);
    setGalleryOpen(true);
  };
  const showNextImage = () => setActiveImage((i) => (i + 1) % galleryImages.length);
  const showPrevImage = () => setActiveImage((i) => (i - 1 + galleryImages.length) % galleryImages.length);

  return (
    <Container className="py-8">
      <SEO
        title={hotel.name}
        description={hotel.description?.substring(0, 160) || `Book ${hotel.name} in ${hotel.city}, Nepal. ${hotel.star_rating}-star hotel with excellent amenities.`}
        keywords={`${hotel.name}, ${hotel.city} hotel, Nepal hotel, ${hotel.star_rating} star hotel, ${hotel.district} accommodation`}
        ogImage={hotel.featured_image}
        ogType="hotel"
        canonical={`/hotels/${hotel.slug}`}
        jsonLd={generateHotelJsonLd(hotel)}
      />
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-neutral-500 mb-6">
        <Link to="/" className="hover:text-neutral-700">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/hotels" className="hover:text-neutral-700">Hotels</Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-900">{hotel.name}</span>
      </nav>

      {/* Hotel Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold text-neutral-900">{hotel.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-neutral-600">
            <span className="flex items-center">
              <MapPin className="h-5 w-5 mr-1" />
              {hotel.address}, {hotel.city}
            </span>
            <ExternalRatings
              googleRating={hotel.google_rating}
              googleCount={hotel.google_review_count}
              tripadvisorRating={hotel.tripadvisor_rating}
              tripadvisorCount={hotel.tripadvisor_review_count}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-primary-50 px-4 py-2 rounded-xl">
            <RatingStars rating={hotel.rating} reviewCount={hotel.reviews?.length} size="md" />
          </div>
          <WishlistButton active={inWishlist} onClick={toggleWishlist} />
          <AddToTripButton
            variant="button"
            bookableType="hotel"
            bookableId={hotel.id}
            bookableName={hotel.name}
          />
        </div>
      </div>

      {/* Hosted by vendor */}
      {hotel.user && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link
            to={`/vendors/${hotel.user.slug}`}
            className="inline-flex items-center gap-3 p-3 bg-white rounded-2xl border border-neutral-100 shadow-card hover:shadow-card-hover transition-all duration-300"
          >
            {hotel.user.avatar ? (
              <img
                src={hotel.user.avatar}
                alt={hotel.user.company_name || hotel.user.name}
                className="h-10 w-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <span className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {(hotel.user.company_name || hotel.user.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <div className="text-xs text-neutral-500">Hosted by</div>
              <div className="text-sm font-semibold text-neutral-900">{hotel.user.company_name || hotel.user.name}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400 ml-1" />
          </Link>
          <Button variant="secondary" size="sm" onClick={handleMessageHost} loading={messagingHost}>
            <MessageSquare className="h-4 w-4" />
            Message host
          </Button>
        </div>
      )}

      {/* Photo Gallery — asymmetrical grid: one large hero panel plus two
          stacked thumbnail columns, matching the premium editorial layout. */}
      <div className="relative mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-2 rounded-3xl overflow-hidden h-72 md:h-[420px]">
          <button
            type="button"
            onClick={() => openGallery(0)}
            className={`md:col-span-2 lg:col-span-7 relative overflow-hidden h-72 md:h-full transition-opacity duration-300 ${imageTransitioning ? 'opacity-50' : 'opacity-100'}`}
          >
            <img src={mainImage} alt={hotel.name} className="w-full h-full object-cover hover:brightness-95 transition" />
          </button>
          <div className="hidden md:grid md:col-span-1 lg:col-span-3 grid-rows-2 gap-2 h-full">
            {thumbnailImages.slice(0, 2).map((image, index) => (
              <button
                type="button"
                key={index}
                onClick={() => openGallery(index + 1)}
                className={`relative overflow-hidden transition-opacity duration-300 ${imageTransitioning ? 'opacity-50' : 'opacity-100'}`}
              >
                <img src={image} alt={`${hotel.name} ${index + 1}`} className="w-full h-full object-cover hover:brightness-95 transition" />
              </button>
            ))}
          </div>
          <div className="hidden lg:grid lg:col-span-2 grid-rows-2 gap-2 h-full">
            {thumbnailImages.slice(2, 4).map((image, index) => (
              <button
                type="button"
                key={index + 2}
                onClick={() => openGallery(index + 3)}
                className={`relative overflow-hidden transition-opacity duration-300 ${imageTransitioning ? 'opacity-50' : 'opacity-100'}`}
              >
                <img src={image} alt={`${hotel.name} ${index + 3}`} className="w-full h-full object-cover hover:brightness-95 transition" />
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => openGallery(0)}
          className="absolute bottom-4 right-4 inline-flex items-center gap-2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-semibold text-neutral-800 shadow-sm hover:bg-white transition"
        >
          <ImageIcon className="h-4 w-4" />
          Show all photos
        </button>
      </div>

      {/* Highlights bar — real, derivable facts (no fabricated amenities) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-white rounded-2xl shadow-card mb-8">
        <div className="flex items-start gap-3">
          <Star className="h-6 w-6 text-primary-600 shrink-0" />
          <div>
            <p className="font-headline-sm text-headline-sm font-bold text-neutral-900 leading-tight">{hotel.star_rating}-Star</p>
            <p className="text-xs text-neutral-500 leading-tight">Official rating</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Building2 className="h-6 w-6 text-primary-600 shrink-0" />
          <div>
            <p className="font-headline-sm text-headline-sm font-bold text-neutral-900 leading-tight">{hotel.rooms?.length || 0}</p>
            <p className="text-xs text-neutral-500 leading-tight">Room types</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Check className="h-6 w-6 text-primary-600 shrink-0" />
          <div>
            <p className="font-headline-sm text-headline-sm font-bold text-neutral-900 leading-tight">{hotel.amenities?.length || 0}+</p>
            <p className="text-xs text-neutral-500 leading-tight">Amenities</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="h-6 w-6 text-primary-600 shrink-0" />
          <div>
            <p className="font-headline-sm text-headline-sm font-bold text-neutral-900 leading-tight">{hotel.city}</p>
            <p className="text-xs text-neutral-500 leading-tight">Location</p>
          </div>
        </div>
      </div>

      {/* Fullscreen Gallery Lightbox */}
      {galleryOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex justify-between items-center p-4 text-white">
            <span className="text-sm">{activeImage + 1} / {galleryImages.length}</span>
            <button type="button" onClick={() => setGalleryOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center relative px-4 pb-6">
            <button
              type="button"
              onClick={showPrevImage}
              className="absolute left-2 sm:left-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <img
              src={galleryImages[activeImage]}
              alt={`${hotel.name} ${activeImage + 1}`}
              className="max-h-full max-w-full object-contain rounded-lg"
            />
            <button
              type="button"
              onClick={showNextImage}
              className="absolute right-2 sm:right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* Hotel Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2">
          {/* Room/Suite Cards — real data from hotel.rooms, selecting here
              drives the same state the sidebar's Select uses. */}
          {hotel.rooms && hotel.rooms.length > 0 && (
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-neutral-900 mb-4">Choose Your Room</h2>
              <div className="flex flex-col gap-4">
                {hotel.rooms.map((room) => {
                  const isSelected = selectedRoom?.id === room.id;
                  const roomImage = room.images?.[0] || hotel.featured_image || getHotelImage(hotel.id);
                  return (
                    <Card key={room.id} hoverLift={false} className={`p-5 flex flex-col sm:flex-row gap-5 ${isSelected ? 'ring-2 ring-primary-500' : ''}`}>
                      <div className="sm:w-48 h-40 sm:h-auto rounded-xl overflow-hidden shrink-0">
                        <img src={roomImage} alt={room.room_type || room.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-headline-sm text-headline-sm font-semibold text-neutral-900">{room.room_type || room.name}</h3>
                            <p className="text-sm text-neutral-500 mt-0.5">
                              {[room.bed_type, room.bed_count && `${room.bed_count} beds`, room.capacity && `Max ${room.capacity} guests`].filter(Boolean).join(' • ')}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-price-display text-price-display font-bold text-neutral-900">${room.price}</span>
                            <span className="text-xs text-neutral-500 block">/ night</span>
                          </div>
                        </div>
                        {room.description && (
                          <p className="text-sm text-neutral-600 mt-2 line-clamp-2">{room.description}</p>
                        )}
                        {room.amenities?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {room.amenities.slice(0, 4).map((amenity, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-600 text-xs">{amenity}</span>
                            ))}
                          </div>
                        )}
                        <div className="mt-auto pt-3">
                          <Button
                            variant={isSelected ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => { setSelectedRoom(room); setAvailabilityStatus(null); }}
                          >
                            {isSelected ? <Check className="h-4 w-4" /> : null}
                            {isSelected ? 'Selected' : 'Select This Room'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <Card hoverLift={false} className="p-6 mb-6">
            <h2 className="font-display text-2xl font-bold text-neutral-900 mb-4">About this Hotel</h2>
            <p className="text-neutral-600 whitespace-pre-line">{hotel.description}</p>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">
                Amenities
                {selectedRoom && (
                  <span className="text-sm font-normal text-primary-600 ml-2">
                    (for {selectedRoom.room_type || selectedRoom.name})
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {displayAmenities?.map((amenity, index) => (
                  <div key={index} className="flex items-center text-neutral-600">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    {amenity}
                  </div>
                ))}
              </div>
              {displayAmenities?.length === 0 && (
                <p className="text-neutral-500 text-sm">No amenities listed</p>
              )}
            </div>

            {hotel.policies && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Policies</h3>
                <p className="text-neutral-600">{hotel.policies}</p>
              </div>
            )}
          </Card>

          {/* Enhance your stay — attach local activities to this hotel booking */}
          {nearbyActivities.length > 0 && (
            <Card hoverLift={false} className="p-6 mb-6">
              <h2 className="font-display text-2xl font-bold text-neutral-900 mb-1">Enhance Your Stay</h2>
              <p className="text-sm text-neutral-500 mb-5">Add local tours and activities to your booking — optional, priced per person.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {nearbyActivities.map((activity) => {
                  const qty = extraQuantity(activity.id);
                  return (
                    <div
                      key={activity.id}
                      className={`flex gap-3 p-3 rounded-xl border-2 transition ${qty > 0 ? 'border-primary-600 bg-primary-50' : 'border-neutral-200'}`}
                    >
                      <img
                        src={getActivityImage(activity)}
                        alt={activity.name}
                        className="h-16 w-16 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-neutral-900 text-sm truncate">{activity.name}</p>
                        <p className="text-xs text-neutral-500 mb-2">{formatPrice(activity.price)} / person</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExtraQuantity(activity.id, qty - 1)}
                            disabled={qty === 0}
                            className="h-7 w-7 rounded-full border border-neutral-300 flex items-center justify-center disabled:opacity-40 hover:bg-neutral-100"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-5 text-center text-sm font-medium">{qty}</span>
                          <button
                            type="button"
                            onClick={() => setExtraQuantity(activity.id, qty + 1)}
                            className="h-7 w-7 rounded-full border border-neutral-300 flex items-center justify-center hover:bg-neutral-100"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Availability Calendar */}
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-neutral-900 mb-4">Availability</h2>
            <BookingCalendar hotelId={hotel.id} roomId={selectedRoom?.id || null} />
          </div>

          {/* Location — real address, plus an embedded map only when the
              hotel actually has coordinates (never fabricated). */}
          <Card hoverLift={false} className="p-6 mb-6">
            <h2 className="font-display text-2xl font-bold text-neutral-900 mb-4">Location</h2>
            <div className="flex items-start gap-3 text-neutral-600 mb-4">
              <MapPin className="h-5 w-5 text-primary-600 shrink-0 mt-0.5" />
              <span>{hotel.address}, {hotel.city}{hotel.district ? `, ${hotel.district}` : ''}</span>
            </div>
            {hotel.latitude && hotel.longitude && (
              <div className="rounded-xl overflow-hidden h-64 border border-neutral-100">
                <iframe
                  title="Hotel location"
                  className="w-full h-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${hotel.latitude},${hotel.longitude}&output=embed`}
                />
              </div>
            )}
          </Card>

          {/* Reviews */}
          <Card hoverLift={false} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold text-neutral-900">Reviews</h2>
              {hotel.reviews?.length > 0 && (
                <RatingStars rating={hotel.rating} reviewCount={hotel.reviews.length} size="md" />
              )}
            </div>

            {/* Real rating distribution (computed from actual reviews, not
                fabricated per-category scores) */}
            {hotel.reviews?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-4 bg-neutral-50 rounded-xl mb-6">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = hotel.reviews.filter((r) => Math.round(r.rating) === star).length;
                  const pct = Math.round((count / hotel.reviews.length) * 100);
                  return (
                    <div key={star}>
                      <div className="flex justify-between text-xs font-semibold text-neutral-700 mb-1">
                        <span>{star}★</span>
                        <span>{count}</span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-1.5">
                        <div className="bg-primary-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {hotel.reviews?.length > 0 ? (
              <div className="space-y-4 mb-6">
                {hotel.reviews.slice(0, 3).map((review) => (
                  <Card key={review.id} hoverLift={false} className="p-4 shadow-none border-neutral-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900">{review.user?.name}</span>
                        <RatingStars rating={review.rating} />
                      </div>
                      <span className="text-sm text-neutral-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 text-neutral-600">{review.comment}</p>
                    {/* Review Photos */}
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {review.images.map((image, idx) => (
                          <img
                            key={idx}
                            src={image}
                            alt={`Review photo ${idx + 1}`}
                            className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:scale-105 transition"
                            onClick={() => window.open(image, '_blank')}
                          />
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 mb-6">No reviews yet.</p>
            )}

            {/* Review Form */}
            <form onSubmit={handleReviewSubmit} className="border-t border-neutral-200 pt-4">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Write a Review</h3>
              <Select
                label="Rating"
                value={reviewForm.rating}
                onChange={(e) => setReviewForm({ ...reviewForm, rating: parseInt(e.target.value) })}
                className="mb-3"
              >
                <option value="0">Select a rating...</option>
                <option value="5">5 Stars - Excellent</option>
                <option value="4">4 Stars - Very Good</option>
                <option value="3">3 Stars - Good</option>
                <option value="2">2 Stars - Fair</option>
                <option value="1">1 Star - Poor</option>
              </Select>

              <Textarea
                label="Your Review"
                rows={4}
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                placeholder="Share your experience..."
                required
                className="mb-3"
              />

              {/* Photo Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Add Photos (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setReviewForm({ ...reviewForm, photos: Array.from(e.target.files) })}
                  className="hidden"
                  id="review-photos"
                />
                <label
                  htmlFor="review-photos"
                  className="inline-flex items-center px-4 py-2 border border-neutral-300 rounded-xl cursor-pointer hover:bg-neutral-50 text-neutral-700 text-sm font-medium"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {reviewForm.photos?.length > 0
                    ? `${reviewForm.photos.length} photo(s) selected`
                    : "Upload photos"}
                </label>
                {reviewForm.photos?.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {reviewForm.photos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={URL.createObjectURL(photo)}
                        alt={`Preview ${idx}`}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
              </div>
              <Button type="submit" loading={submittingReview}>
                {!submittingReview && <Send className="h-4 w-4" />}
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column - Booking */}
        <div>
          <Card hoverLift={false} className="p-6 sticky top-24">
            <h3 className="font-display text-xl font-bold text-neutral-900 mb-4">Book Your Stay</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-primary-600">{formatPrice(selectedRoom ? selectedRoom.price : hotel.price_per_night)}</span>
              <span className="text-neutral-500"> / night</span>
            </div>

            {/* Date Pickers */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Check-in Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 z-10" />
                  <DatePicker
                    selected={checkInDate}
                    onChange={setCheckInDate}
                    minDate={new Date()}
                    placeholderText="Select date"
                    className="w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    dateFormat="yyyy-MM-dd"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Check-out Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 z-10" />
                  <DatePicker
                    selected={checkOutDate}
                    onChange={setCheckOutDate}
                    minDate={checkInDate ? new Date(checkInDate.getTime() + 86400000) : new Date()}
                    placeholderText="Select date"
                    className="w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    dateFormat="yyyy-MM-dd"
                  />
                </div>
              </div>
            </div>

            {/* Guest Counter */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-xl">
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-neutral-400 mr-2" />
                  <span className="text-sm font-medium text-neutral-700">Adults</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    className="p-1 rounded-full bg-neutral-100 hover:bg-neutral-200"
                    disabled={adults <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium w-4 text-center">{adults}</span>
                  <button
                    onClick={() => setAdults(adults + 1)}
                    className="p-1 rounded-full bg-neutral-100 hover:bg-neutral-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-xl">
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-neutral-400 mr-2" />
                  <span className="text-sm font-medium text-neutral-700">Children</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setChildren(Math.max(0, children - 1))}
                    className="p-1 rounded-full bg-neutral-100 hover:bg-neutral-200"
                    disabled={children <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium w-4 text-center">{children}</span>
                  <button
                    onClick={() => setChildren(children + 1)}
                    className="p-1 rounded-full bg-neutral-100 hover:bg-neutral-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Room Selector (if hotel has rooms) */}
            {hotel.rooms && hotel.rooms.length > 0 && (
              <div className="mb-4">
                <Select
                  label="Select Room Type"
                  value={selectedRoom?.id || ''}
                  onChange={(e) => {
                    const room = hotel.rooms.find(r => r.id === parseInt(e.target.value));
                    setSelectedRoom(room);
                    setAvailabilityStatus(null);
                  }}
                >
                  <option value="">Select a room...</option>
                  {hotel.rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_type || room.name} - ${room.price}/night
                      {room.capacity && ` • Max ${room.capacity} guests`}
                      {room.bed_type && ` • ${room.bed_type}`}
                      {room.bed_count && ` • ${room.bed_count} beds`}
                    </option>
                  ))}
                </Select>

                {/* Selected Room Details */}
                {selectedRoom && (
                  <div className="mt-3 p-3 bg-primary-50 rounded-xl border border-primary-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-primary-900">Selected: {selectedRoom.room_type || selectedRoom.name}</span>
                      <span className="text-primary-700 font-semibold">${selectedRoom.price}/night</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-primary-700">
                      {selectedRoom.bed_type && (
                        <div className="flex items-center">
                          <span className="font-medium">Bed:</span>
                          <span className="ml-1">{selectedRoom.bed_type}</span>
                        </div>
                      )}
                      {selectedRoom.bed_count && (
                        <div className="flex items-center">
                          <span className="font-medium">Beds:</span>
                          <span className="ml-1">{selectedRoom.bed_count}</span>
                        </div>
                      )}
                      {selectedRoom.capacity && (
                        <div className="flex items-center">
                          <span className="font-medium">Capacity:</span>
                          <span className="ml-1">Max {selectedRoom.capacity} guests</span>
                        </div>
                      )}
                      {selectedRoom.room_number && (
                        <div className="flex items-center">
                          <span className="font-medium">Room:</span>
                          <span className="ml-1">{selectedRoom.room_number}</span>
                        </div>
                      )}
                    </div>
                    {selectedRoom.description && (
                      <p className="text-xs text-primary-600 mt-2">{selectedRoom.description}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Availability Status */}
            {availabilityStatus && (
              <div className={`mb-4 p-3 rounded-xl text-sm ${availabilityStatus.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {availabilityStatus.message}
              </div>
            )}

            {/* Price Summary */}
            {calculateNights() > 0 && (
              <div className="mb-4 p-4 bg-neutral-50 rounded-xl">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-600">{formatPrice(selectedRoom ? selectedRoom.price : hotel.price_per_night)} x {calculateNights()} nights</span>
                  <span className="font-medium">{formatPrice((selectedRoom ? selectedRoom.price : hotel.price_per_night) * calculateNights())}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-600">Guests ({adults + children})</span>
                  <span className="font-medium">x {adults + children}</span>
                </div>
                {calculateExtrasTotal() > 0 && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-600">Added activities</span>
                    <span className="font-medium">{formatPrice(calculateExtrasTotal())}</span>
                  </div>
                )}
                <div className="border-t border-neutral-200 pt-2 mt-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary-600">{formatPrice(calculateTotalPrice() + calculateExtrasTotal())}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Check Availability Button */}
            <Button
              variant="secondary"
              fullWidth
              onClick={checkAvailability}
              disabled={checkingAvailability || !checkInDate || !checkOutDate}
              loading={checkingAvailability}
              className="mb-3 border-primary-600 text-primary-600 hover:bg-primary-50"
            >
              {checkingAvailability ? 'Checking...' : 'Check Availability'}
            </Button>

            {/* Book Now Button */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleProceedToCheckout}
              disabled={!availabilityStatus?.available || !selectedRoom}
            >
              {availabilityStatus?.available && selectedRoom ? 'Book Now' :
               !selectedRoom ? 'Select Room Type to Book' : 'Select Dates to Book'}
            </Button>

            <p className="text-xs text-neutral-500 mt-3 text-center">
              You won't be charged yet. Free cancellation available.
            </p>

            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-neutral-100 text-neutral-400 text-xs">
              <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Secure Payment</span>
              <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Best Price</span>
            </div>
          </Card>
        </div>
      </div>
    </Container>
  );
};

export default HotelDetails;
