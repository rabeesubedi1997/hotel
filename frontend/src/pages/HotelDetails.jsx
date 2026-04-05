import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, Phone, Mail, Check, Heart, Loader2, Send } from 'lucide-react';
import { hotelsAPI, wishlistsAPI, reviewsAPI } from '../services/api';
import useAuthStore from '../stores/authStore';
import { getHotelImage } from '../utils/images';
import ExternalRatings from '../components/ExternalRatings';
import SEO, { generateHotelJsonLd } from '../components/SEO';

const HotelDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchHotel();
  }, [slug]);

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
      await reviewsAPI.create({
        reviewable_type: 'hotel',
        reviewable_id: hotel.id,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      setReviewForm({ rating: 5, comment: '' });
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
      if (inWishlist) {
        // Remove from wishlist - would need the wishlist ID
        setInWishlist(false);
      } else {
        await wishlistsAPI.add({
          wishlistable_type: 'hotel',
          wishlistable_id: hotel.id,
        });
        setInWishlist(true);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
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
        <div>
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
        <div className="flex items-center mt-4 md:mt-0 space-x-4">
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

      {/* Image Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="h-96 rounded-lg overflow-hidden">
          <img src={hotel.featured_image || getHotelImage(hotel.id)} alt={hotel.name} className="w-full h-full object-cover" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {(hotel.images?.length > 0 ? hotel.images : [getHotelImage(hotel.id + 1), getHotelImage(hotel.id + 2), getHotelImage(hotel.id + 3), getHotelImage(hotel.id + 4)]).slice(0, 4).map((image, index) => (
            <div key={index} className="h-44 rounded-lg overflow-hidden">
              <img src={image} alt={`${hotel.name} ${index + 1}`} className="w-full h-full object-cover hover:scale-105 transition" />
            </div>
          ))}
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
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {hotel.amenities?.map((amenity, index) => (
                  <div key={index} className="flex items-center text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    {amenity}
                  </div>
                ))}
              </div>
            </div>

            {hotel.policies && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Policies</h3>
                <p className="text-gray-600">{hotel.policies}</p>
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Reviews</h2>
            {hotel.reviews?.length > 0 ? (
              <div className="space-y-4 mb-6">
                {hotel.reviews.slice(0, 3).map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="font-semibold">{review.user?.name}</span>
                        <div className="ml-2 flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="ml-1">{review.rating}</span>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 text-gray-600">{review.comment}</p>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="5">5 Stars - Excellent</option>
                  <option value="4">4 Stars - Very Good</option>
                  <option value="3">3 Stars - Good</option>
                  <option value="2">2 Stars - Fair</option>
                  <option value="1">1 Star - Poor</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Review</label>
                <textarea
                  rows="3"
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Share your experience..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submittingReview}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {submittingReview ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Send className="h-5 w-5 mr-2" />
                )}
                Submit Review
              </button>
            </form>
          </div>
        </div>

        {/* Right Column - Booking */}
        <div>
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Book Your Stay</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-primary-600">${hotel.price_per_night}</span>
              <span className="text-gray-500"> / night</span>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              {hotel.phone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="h-5 w-5 mr-2" />
                  {hotel.phone}
                </div>
              )}
              {hotel.email && (
                <div className="flex items-center text-gray-600">
                  <Mail className="h-5 w-5 mr-2" />
                  {hotel.email}
                </div>
              )}
            </div>

            <Link
              to={`/checkout?type=hotel&id=${hotel.slug}`}
              className="block w-full bg-primary-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-primary-700"
            >
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelDetails;
