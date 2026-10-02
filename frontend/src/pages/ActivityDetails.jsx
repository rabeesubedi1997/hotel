import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Loader2,
  Clock,
  Users,
  AlertTriangle,
  Check,
  Shield,
  Send,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  X,
  MessageSquare,
  Compass,
  BarChart3,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { activitiesAPI, wishlistsAPI, reviewsAPI } from '../services/api';
import useAuthStore from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import { useToast } from '../contexts/ToastContext';
import { getActivityImage } from '../utils/images';
import ExternalRatings from '../components/ExternalRatings';
import SEO, { generateActivityJsonLd } from '../components/SEO';
import { Button, Textarea, Select, Card, Badge, RatingStars, Container, WishlistButton } from '../components/ui';
import AddToTripButton from '../components/AddToTripButton';
import useCurrencyStore from '../stores/currencyStore';
import { loginUrl } from '../utils/loginRedirect';
import MobileBookingBar from '../components/MobileBookingBar';

const DIFFICULTY_TONE = {
  easy: 'success',
  moderate: 'warning',
  challenging: 'accent',
  extreme: 'danger',
};

const ActivityDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const formatPrice = useCurrencyStore((s) => s.formatPrice);
  const bookingCardRef = useRef(null);
  const { startConversation } = useChatStore();
  const toast = useToast();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [messagingHost, setMessagingHost] = useState(false);

  // Photo gallery lightbox state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

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
      navigate(loginUrl());
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
      toast.success('Thanks! Your review will appear once it has been approved.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not submit your review. Please try again.');
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
      navigate(loginUrl());
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

  const handleMessageHost = async () => {
    if (!isAuthenticated) {
      toast.info('Please log in to message the host.');
      navigate(loginUrl());
      return;
    }
    setMessagingHost(true);
    const result = await startConversation({
      type: 'vendor_inquiry',
      vendor_id: activity.user.id,
      subject_type: 'activity',
      subject_id: activity.id,
      message: "Hi, I'm interested in this listing.",
    });
    setMessagingHost(false);
    if (result.success) {
      navigate(`/messages/${result.conversation.id}`);
    } else {
      toast.error(result.error);
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
      <Container className="py-8 text-center">
        <h2 className="text-2xl font-bold text-neutral-900">Activity not found</h2>
        <Link to="/activities" className="text-primary-600 mt-4 inline-block">
          Browse other activities
        </Link>
      </Container>
    );
  }

  // Gallery images: activity.images array, falling back to the type stock photo
  const galleryImages = activity.images && activity.images.length > 0
    ? activity.images
    : [activity.featured_image || getActivityImage(activity.type)];
  const mainImage = galleryImages[0];
  const thumbnailImages = galleryImages.slice(1, 5);

  const openGallery = (index = 0) => {
    setActiveImage(index);
    setGalleryOpen(true);
  };
  const showNextImage = () => setActiveImage((i) => (i + 1) % galleryImages.length);
  const showPrevImage = () => setActiveImage((i) => (i - 1 + galleryImages.length) % galleryImages.length);

  return (
    <div>
      <SEO
        title={activity.name}
        description={activity.description?.substring(0, 160) || `Book ${activity.name} in ${activity.location}, Nepal. ${activity.type} activity with ${activity.difficulty_level} difficulty level.`}
        keywords={`${activity.name}, ${activity.type} Nepal, ${activity.location} activities, adventure Nepal, ${activity.difficulty_level} trekking`}
        ogImage={activity.featured_image}
        ogType="website"
        canonical={`/activities/${activity.slug}`}
        jsonLd={generateActivityJsonLd(activity)}
      />

      {/* Atmospheric hero — breadcrumb, badges, title, and a real metrics
          bar (duration/difficulty/group size/type), no fabricated data. */}
      <div className="relative bg-neutral-900 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{ backgroundImage: `url(${activity.featured_image || getActivityImage(activity.type)})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/70 to-transparent" />
        <Container className="relative pt-8 pb-10 sm:pt-12 sm:pb-14">
          <nav className="flex items-center text-sm text-neutral-300 mb-6">
            <Link to="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/activities" className="hover:text-white">Activities</Link>
            <span className="mx-2">/</span>
            <span className="text-white">{activity.name}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge tone={DIFFICULTY_TONE[activity.difficulty_level] || 'neutral'} className="capitalize">
              {activity.difficulty_level}
            </Badge>
            <Badge tone="info" className="uppercase">{activity.type}</Badge>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">{activity.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-3 text-neutral-200">
                <span className="flex items-center">
                  <MapPin className="h-5 w-5 mr-1" />
                  {activity.location}, {activity.city}
                </span>
                <ExternalRatings
                  googleRating={activity.google_rating}
                  googleCount={activity.google_review_count}
                  tripadvisorRating={activity.tripadvisor_rating}
                  tripadvisorCount={activity.tripadvisor_review_count}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              {activity.rating > 0 && (
                <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl">
                  <RatingStars rating={activity.rating} reviewCount={activity.reviews?.length} size="md" />
                </div>
              )}
              <WishlistButton active={inWishlist} onClick={toggleWishlist} />
              <AddToTripButton
                variant="button"
                bookableType="activity"
                bookableId={activity.id}
                bookableName={activity.name}
              />
            </div>
          </div>

          {/* Key metrics bar */}
          <div className="mt-8 p-5 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-md grid grid-cols-2 sm:grid-cols-4 gap-6 text-white">
            <div className="flex flex-col gap-1">
              <span className="font-label-caps text-label-caps text-primary-300 uppercase tracking-wider">Duration</span>
              <span className="font-headline-sm text-headline-sm font-semibold flex items-center gap-1.5"><Clock className="h-4 w-4" />{activity.duration}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-caps text-label-caps text-primary-300 uppercase tracking-wider">Difficulty</span>
              <span className="font-headline-sm text-headline-sm font-semibold flex items-center gap-1.5 capitalize"><BarChart3 className="h-4 w-4" />{activity.difficulty_level}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-caps text-label-caps text-primary-300 uppercase tracking-wider">Group Size</span>
              <span className="font-headline-sm text-headline-sm font-semibold flex items-center gap-1.5"><Users className="h-4 w-4" />Max {activity.max_participants}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-caps text-label-caps text-primary-300 uppercase tracking-wider">Category</span>
              <span className="font-headline-sm text-headline-sm font-semibold flex items-center gap-1.5 capitalize"><Compass className="h-4 w-4" />{activity.type?.replace('_', ' ')}</span>
            </div>
          </div>
        </Container>
      </div>

    <Container className="py-8">
      {/* Hosted by vendor */}
      {activity.user && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link
            to={`/vendors/${activity.user.slug}`}
            className="inline-flex items-center gap-3 p-3 bg-white rounded-2xl border border-neutral-100 shadow-card hover:shadow-card-hover transition-all duration-300"
          >
            {activity.user.avatar ? (
              <img
                src={activity.user.avatar}
                alt={activity.user.company_name || activity.user.name}
                className="h-10 w-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <span className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {(activity.user.company_name || activity.user.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <div className="text-xs text-neutral-500">Hosted by</div>
              <div className="text-sm font-semibold text-neutral-900">{activity.user.company_name || activity.user.name}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400 ml-1" />
          </Link>
          <Button variant="secondary" size="sm" onClick={handleMessageHost} loading={messagingHost}>
            <MessageSquare className="h-4 w-4" />
            Message host
          </Button>
        </div>
      )}

      {/* Photo Grid Gallery */}
      <div className="relative mb-8">
        <div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-3xl overflow-hidden h-72 md:h-[420px]">
          <button
            type="button"
            onClick={() => openGallery(0)}
            className={`relative overflow-hidden ${thumbnailImages.length > 0 ? 'col-span-4 md:col-span-2 row-span-2' : 'col-span-4 row-span-2'}`}
          >
            <img src={mainImage} alt={activity.name} className="w-full h-full object-cover hover:brightness-95 transition" />
          </button>
          {thumbnailImages.map((image, index) => (
            <button
              type="button"
              key={index}
              onClick={() => openGallery(index + 1)}
              className="hidden md:block relative overflow-hidden"
            >
              <img src={image} alt={`${activity.name} ${index + 1}`} className="w-full h-full object-cover hover:brightness-95 transition" />
            </button>
          ))}
        </div>
        {galleryImages.length > 1 && (
          <button
            type="button"
            onClick={() => openGallery(0)}
            className="absolute bottom-4 right-4 inline-flex items-center gap-2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-semibold text-neutral-800 shadow-sm hover:bg-white transition"
          >
            <ImageIcon className="h-4 w-4" />
            Show all photos
          </button>
        )}
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
              alt={`${activity.name} ${activeImage + 1}`}
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

      {/* Activity Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2">
          <Card hoverLift={false} className="p-6 mb-6">
            <h2 className="font-display text-2xl font-bold text-neutral-900 mb-4">About this Activity</h2>
            <p className="text-neutral-600 whitespace-pre-line">{activity.description}</p>
          </Card>

          {/* What's Included */}
          {activity.includes?.length > 0 && (
            <Card hoverLift={false} className="p-6 mb-6">
              <h3 className="text-xl font-semibold text-neutral-900 mb-4">What's Included</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activity.includes.map((item, index) => (
                  <div key={index} className="p-3.5 rounded-xl bg-neutral-50 flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="text-sm text-neutral-700 pt-1.5">{item}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Requirements */}
          {activity.requirements && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">Requirements</h3>
                  <p className="text-amber-700">{activity.requirements}</p>
                </div>
              </div>
            </div>
          )}

          {/* Safety Info */}
          {activity.safety_info && (
            <div className="bg-primary-50 border border-primary-200 rounded-2xl p-6 mb-6">
              <div className="flex items-start">
                <Shield className="h-5 w-5 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-primary-800 mb-2">Safety Information</h3>
                  <p className="text-primary-700">{activity.safety_info}</p>
                </div>
              </div>
            </div>
          )}

          {/* Reviews */}
          <Card hoverLift={false} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold text-neutral-900">Reviews</h2>
              {activity.reviews?.length > 0 && (
                <RatingStars rating={activity.rating} reviewCount={activity.reviews.length} size="md" />
              )}
            </div>
            {activity.reviews?.length > 0 ? (
              <div className="space-y-4 mb-6">
                {activity.reviews.slice(0, 3).map((review) => (
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
                <option value="5">5 Stars - Excellent</option>
                <option value="4">4 Stars - Very Good</option>
                <option value="3">3 Stars - Good</option>
                <option value="2">2 Stars - Fair</option>
                <option value="1">1 Star - Poor</option>
              </Select>
              <Textarea
                label="Your Review"
                rows={3}
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                placeholder="Share your experience..."
                required
                className="mb-3"
              />
              <Button type="submit" loading={submittingReview}>
                {!submittingReview && <Send className="h-4 w-4" />}
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column - Booking */}
        <div ref={bookingCardRef} className="scroll-mt-20">
          <Card hoverLift={false} className="p-6 sticky top-24">
            <h3 className="font-display text-xl font-bold text-neutral-900 mb-4">Book This Activity</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-primary-600">{formatPrice(activity.price)}</span>
              <span className="text-neutral-500"> / person</span>
            </div>

            {/* Activity Details */}
            <div className="space-y-3 mb-6 text-neutral-600">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                {activity.duration}
              </div>
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Max {activity.max_participants} participants
              </div>
            </div>

            <Button as={Link} to={`/checkout?type=activity&id=${activity.slug}`} size="lg" fullWidth>
              Book Now
            </Button>

            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-neutral-100 text-neutral-400 text-xs">
              <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Secure Payment</span>
              <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Best Price</span>
            </div>
          </Card>
        </div>
      </div>

      <MobileBookingBar targetRef={bookingCardRef} price={formatPrice(activity.price)} unit="/ person" ctaLabel="Book now" />
    </Container>
    </div>
  );
};

export default ActivityDetails;
