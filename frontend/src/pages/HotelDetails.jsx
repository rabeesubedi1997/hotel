// Cache bust: 2025-04-07-12-54-00 - All imports fixed including bookingsAPI
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  MapPin, 
  Star, 
  Phone, 
  Mail, 
  Globe, 
  Calendar as CalendarIcon,
  Calendar,
  Users,
  Wifi,
  Car,
  Coffee,
  Dumbbell,
  Check,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  Upload,
  Send,
  Plus,
  Minus
} from 'lucide-react';
// Fixed Upload import - cache refresh
import { hotelsAPI, activitiesAPI, reviewsAPI, wishlistsAPI, bookingsAPI } from '../services/api';
import useAuthStore from '../stores/authStore';
import { useToast } from '../contexts/ToastContext';
import BookingCalendar from '../components/BookingCalendar';
import { getHotelImage } from '../utils/images';
import ExternalRatings from '../components/ExternalRatings';
import SEO, { generateHotelJsonLd } from '../components/SEO';

const HotelDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const toast = useToast();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistId, setWishlistId] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: '',
    photos: [],
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // Booking form state
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [displayImages, setDisplayImages] = useState([]);
  const [displayAmenities, setDisplayAmenities] = useState([]);
  const [imageTransitioning, setImageTransitioning] = useState(false);

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
    } catch (error) {
      console.error('Error fetching hotel:', error);
    } finally {
      setLoading(false);
    }
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
        check_in_date: checkInDate.toISOString().split('T')[0],
        check_out_date: checkOutDate.toISOString().split('T')[0],
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
      total_price: calculateTotalPrice(),
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
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Hotel not found</h2>
        <Link to="/hotels" className="text-primary-600 mt-4 inline-block">
          Browse other hotels
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      <nav className="flex items-center text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-gray-700">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/hotels" className="hover:text-gray-700">Hotels</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{hotel.name}</span>
      </nav>

      {/* Hotel Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{hotel.name}</h1>
          <div className="flex items-center mt-2 text-gray-600">
            <MapPin className="h-5 w-5 mr-1" />
            {hotel.address}, {hotel.city}
            <ExternalRatings
              googleRating={hotel.google_rating}
              googleCount={hotel.google_review_count}
              tripadvisorRating={hotel.tripadvisor_rating}
              tripadvisorCount={hotel.tripadvisor_review_count}
            />
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center items-start mt-4 md:mt-0 space-y-4 md:space-y-0 md:space-x-4">
          {/* Admin Management Buttons */}
          {isAuthenticated && (user?.role === 'admin' || user?.role === 'manager') && (
            <div className="flex flex-col sm:flex-row gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Link
                to={`/admin/hotels/${hotel.id}/edit`}
                className="inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Edit Hotel
              </Link>
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ${hotel.name}?`)) {
                    // Handle delete functionality
                    console.log('Delete hotel:', hotel.id);
                  }
                }}
                className="inline-flex items-center justify-center px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                Delete Hotel
              </button>
            </div>
          )}
          
          {/* Wishlist and Rating */}
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleWishlist}
              className={`p-2 rounded-full ${inWishlist ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
            >
              <Heart className={`h-6 w-6 ${inWishlist ? 'fill-current' : ''}`} />
            </button>
            <div className="flex items-center bg-primary-50 px-4 py-2 rounded-lg">
              <Star className="h-5 w-5 text-yellow-400 fill-current" />
              <span className="ml-1 font-bold text-lg">{hotel.rating}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`h-96 rounded-lg overflow-hidden transition-opacity duration-300 ${imageTransitioning ? 'opacity-50' : 'opacity-100'}`}>
            <img src={displayImages[0] || hotel.featured_image || getHotelImage(hotel.id)} alt={hotel.name} className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {(displayImages.length > 0 ? displayImages : [getHotelImage(hotel.id + 1), getHotelImage(hotel.id + 2), getHotelImage(hotel.id + 3), getHotelImage(hotel.id + 4)]).slice(0, 4).map((image, index) => (
              <div key={index} className={`h-44 rounded-lg overflow-hidden transition-opacity duration-300 ${imageTransitioning ? 'opacity-50' : 'opacity-100'}`}>
                <img src={image} alt={`${hotel.name} ${index + 1}`} className="w-full h-full object-cover hover:scale-105 transition" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hotel Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">About this Hotel</h2>
            <p className="text-gray-600">{hotel.description}</p>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Amenities 
                {selectedRoom && (
                  <span className="text-sm font-normal text-primary-600 ml-2">
                    (for {selectedRoom.room_type || selectedRoom.name})
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {displayAmenities?.map((amenity, index) => (
                  <div key={index} className="flex items-center text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    {amenity}
                  </div>
                ))}
              </div>
              {displayAmenities?.length === 0 && (
                <p className="text-gray-500 text-sm">No amenities listed</p>
              )}
            </div>

            {hotel.policies && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Policies</h3>
                <p className="text-gray-600">{hotel.policies}</p>
              </div>
            )}
          </div>

          {/* Availability Calendar */}
          <BookingCalendar hotelId={hotel.id} roomId={selectedRoom?.id} />

          {/* Reviews */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Reviews</h2>
            {hotel.reviews?.length > 0 ? (
              <div className="space-y-4 mb-6">
                {hotel.reviews.slice(0, 3).map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center">
                        <span className="font-semibold">{review.user?.name}</span>
                        <div className="ml-2 flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="ml-1">{review.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full sm:w-auto">
                        <span className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                        {/* Admin Review Management */}
                        {isAuthenticated && (user?.role === 'admin' || user?.role === 'manager') && (
                          <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0 sm:ml-4 p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <button
                              onClick={() => {
                                // Handle edit review
                                console.log('Edit review:', review.id);
                              }}
                              className="inline-flex items-center justify-center px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this review?')) {
                                  // Handle delete review
                                  console.log('Delete review:', review.id);
                                }
                              }}
                              className="inline-flex items-center justify-center px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-gray-600">{review.comment}</p>
                    {/* Review Photos */}
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mt-3">
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
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 mb-6">No reviews yet.</p>
            )}

            {/* Review Form */}
            <form onSubmit={handleReviewSubmit} className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Write a Review</h3>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                <select
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm({ ...reviewForm, rating: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="0">Select a rating...</option>
                  <option value="5">5 Stars - Excellent</option>
                  <option value="4">4 Stars - Very Good</option>
                  <option value="3">3 Stars - Good</option>
                  <option value="2">2 Stars - Fair</option>
                  <option value="1">1 Star - Poor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review
                </label>
                <textarea
                  rows={4}
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Share your experience..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {reviewForm.photos?.length > 0 
                    ? `${reviewForm.photos.length} photo(s) selected` 
                    : "Upload photos"}
                </label>
                {reviewForm.photos?.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {reviewForm.photos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={URL.createObjectURL(photo)}
                        alt={`Preview ${idx}`}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={submittingReview}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {submittingReview ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Submit Review
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column - Booking */}
        <div>
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Book Your Stay</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-primary-600">${selectedRoom ? selectedRoom.price : hotel.price_per_night}</span>
              <span className="text-gray-500"> / night</span>
            </div>

            {/* Date Pickers */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <DatePicker
                    selected={checkInDate}
                    onChange={setCheckInDate}
                    minDate={new Date()}
                    placeholderText="Select date"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                    dateFormat="yyyy-MM-dd"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <DatePicker
                    selected={checkOutDate}
                    onChange={setCheckOutDate}
                    minDate={checkInDate ? new Date(checkInDate.getTime() + 86400000) : new Date()}
                    placeholderText="Select date"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                    dateFormat="yyyy-MM-dd"
                  />
                </div>
              </div>
            </div>

            {/* Guest Counter */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Adults</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                    disabled={adults <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium w-4 text-center">{adults}</span>
                  <button
                    onClick={() => setAdults(adults + 1)}
                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Children</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setChildren(Math.max(0, children - 1))}
                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                    disabled={children <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium w-4 text-center">{children}</span>
                  <button
                    onClick={() => setChildren(children + 1)}
                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Room Selector (if hotel has rooms) */}
            {hotel.rooms && hotel.rooms.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Room Type</label>
                <select
                  value={selectedRoom?.id || ''}
                  onChange={(e) => {
                    const room = hotel.rooms.find(r => r.id === parseInt(e.target.value));
                    setSelectedRoom(room);
                    setAvailabilityStatus(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
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
                </select>
                
                {/* Selected Room Details */}
                {selectedRoom && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-blue-900">Selected: {selectedRoom.room_type || selectedRoom.name}</span>
                      <span className="text-blue-700 font-semibold">${selectedRoom.price}/night</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
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
                      <p className="text-xs text-blue-600 mt-2">{selectedRoom.description}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Availability Status */}
            {availabilityStatus && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${availabilityStatus.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {availabilityStatus.message}
              </div>
            )}

            {/* Price Summary */}
            {calculateNights() > 0 && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">${selectedRoom ? selectedRoom.price : hotel.price_per_night} x {calculateNights()} nights</span>
                  <span className="font-medium">${(selectedRoom ? selectedRoom.price : hotel.price_per_night) * calculateNights()}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Guests ({adults + children})</span>
                  <span className="font-medium">x {adults + children}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary-600">${calculateTotalPrice()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Check Availability Button */}
            <button
              onClick={checkAvailability}
              disabled={checkingAvailability || !checkInDate || !checkOutDate}
              className="w-full mb-3 py-2 border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingAvailability ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Checking...
                </span>
              ) : (
                'Check Availability'
              )}
            </button>

            {/* Book Now Button */}
            <button
              onClick={handleProceedToCheckout}
              disabled={!availabilityStatus?.available || !selectedRoom}
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {availabilityStatus?.available && selectedRoom ? 'Book Now' : 
               !selectedRoom ? 'Select Room Type to Book' : 'Select Dates to Book'}
            </button>

            <p className="text-xs text-gray-500 mt-3 text-center">
              You won't be charged yet. Free cancellation available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelDetails;
