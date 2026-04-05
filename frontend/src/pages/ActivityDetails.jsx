import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Heart, Loader2, Clock, Users, AlertTriangle, Check, Shield, Star, Send } from 'lucide-react';
import { activitiesAPI, wishlistsAPI, reviewsAPI } from '../services/api';
import useAuthStore from '../stores/authStore';
import { getActivityImage } from '../utils/images';
import ExternalRatings from '../components/ExternalRatings';
import SEO, { generateActivityJsonLd } from '../components/SEO';

const ActivityDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchActivity();
  }, [slug]);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const response = await activitiesAPI.getBySlug(slug);
      setActivity(response.data);
      if (isAuthenticated) {
        checkWishlist(response.data.id);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
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
        reviewable_type: 'activity',
        reviewable_id: activity.id,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      setReviewForm({ rating: 5, comment: '' });
      fetchActivity();
      alert('Review submitted successfully! It will appear after admin approval.');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const checkWishlist = async (activityId) => {
    try {
      const response = await wishlistsAPI.check({
        wishlistable_type: 'activity',
        wishlistable_id: activityId,
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
        setInWishlist(false);
      } else {
        await wishlistsAPI.add({
          wishlistable_type: 'activity',
          wishlistable_id: activity.id,
        });
        setInWishlist(true);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  };

  const getDifficultyColor = (level) => {
    switch (level) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'challenging': return 'bg-orange-100 text-orange-800';
      case 'extreme': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Activity not found</h2>
        <Link to="/activities" className="text-primary-600 mt-4 inline-block">
          Browse other activities
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO 
        title={activity.name}
        description={activity.description?.substring(0, 160) || `Book ${activity.name} in ${activity.location}, Nepal. ${activity.type} activity with ${activity.difficulty_level} difficulty level.`}
        keywords={`${activity.name}, ${activity.type} Nepal, ${activity.location} activities, adventure Nepal, ${activity.difficulty_level} trekking`}
        ogImage={activity.featured_image}
        ogType="website"
        canonical={`/activities/${activity.slug}`}
        jsonLd={generateActivityJsonLd(activity)}
      />
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-gray-700">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/activities" className="hover:text-gray-700">Activities</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{activity.name}</span>
      </nav>

      {/* Activity Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${getDifficultyColor(activity.difficulty_level)}`}>
            {activity.difficulty_level}
          </span>
          <h1 className="text-3xl font-bold text-gray-900">{activity.name}</h1>
          <div className="flex items-center mt-2 text-gray-600">
            <MapPin className="h-5 w-5 mr-1" />
            {activity.location}, {activity.city}
            <ExternalRatings
              googleRating={activity.google_rating}
              googleCount={activity.google_review_count}
              tripadvisorRating={activity.tripadvisor_rating}
              tripadvisorCount={activity.tripadvisor_review_count}
            />
          </div>
        </div>
        <button
          onClick={toggleWishlist}
          className={`p-2 rounded-full mt-4 md:mt-0 ${inWishlist ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
        >
          <Heart className={`h-6 w-6 ${inWishlist ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Image */}
      <div className="h-96 rounded-lg overflow-hidden mb-8">
        <img src={activity.featured_image || getActivityImage(activity.type)} alt={activity.name} className="w-full h-full object-cover" />
      </div>

      {/* Activity Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">About this Activity</h2>
            <p className="text-gray-600">{activity.description}</p>
          </div>

          {/* What's Included */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">What's Included</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activity.includes?.map((item, index) => (
                <div key={index} className="flex items-center text-gray-600">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Requirements */}
          {activity.requirements && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">Requirements</h3>
                  <p className="text-yellow-700">{activity.requirements}</p>
                </div>
              </div>
            </div>
          )}

          {/* Safety Info */}
          {activity.safety_info && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <div className="flex items-start">
                <Shield className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Safety Information</h3>
                  <p className="text-blue-700">{activity.safety_info}</p>
                </div>
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Reviews</h2>
            {activity.reviews?.length > 0 ? (
              <div className="space-y-4 mb-6">
                {activity.reviews.slice(0, 3).map((review) => (
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
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Book This Activity</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-primary-600">${activity.price}</span>
              <span className="text-gray-500"> / person</span>
            </div>

            {/* Activity Details */}
            <div className="space-y-3 mb-6 text-gray-600">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                {activity.duration}
              </div>
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Max {activity.max_participants} participants
              </div>
            </div>

            <Link
              to={`/checkout?type=activity&id=${activity.slug}`}
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

export default ActivityDetails;
