import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Award,
  CheckCircle,
  Globe,
  Star,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';
import { publicAPI, enquiriesAPI } from '../services/api';
import SEO from '../components/SEO';
import useAuthStore from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import { useToast } from '../contexts/ToastContext';
import { Button, Input, Textarea, Select, Card, Badge, RatingStars, Container } from '../components/ui';
import AddToTripButton from '../components/AddToTripButton';

const TourGuideDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    booking_date: '',
    duration_days: 1,
    message: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');
  const [messagingHost, setMessagingHost] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const { startConversation } = useChatStore();
  const toast = useToast();

  useEffect(() => {
    fetchGuide();
  }, [slug]);

  const fetchGuide = async () => {
    try {
      const response = await publicAPI.getTourGuide(slug);
      setGuide(response.data);
    } catch (err) {
      console.error('Error fetching guide:', err);
      setError('Tour guide not found');
    } finally {
      setLoading(false);
    }
  };

  const handleBookGuide = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setBookingMessage('Please login to book a tour guide');
      return;
    }

    setBookingLoading(true);
    try {
      await enquiriesAPI.bookTourGuide(slug, bookingForm);
      setBookingMessage('Booking request sent successfully!');
      setTimeout(() => {
        setShowBookingModal(false);
        setBookingForm({ booking_date: '', duration_days: 1, message: '' });
        setBookingMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error booking guide:', err);
      setBookingMessage(err.response?.data?.message || 'Error sending booking request');
    } finally {
      setBookingLoading(false);
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
      vendor_id: guide.vendor.id,
      subject_type: 'tour_guide',
      subject_id: guide.id,
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-neutral-900 mb-4">Tour Guide</h1>
          <p className="text-neutral-600 mb-6">{error || 'Not found'}</p>
          <Link to="/tour-guides" className="text-primary-600 hover:underline">View All Guides</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <SEO
        title={`${guide.name} - Tour Guide - ReserveNow`}
        description={`${guide.bio?.substring(0, 160) || `Professional tour guide with ${guide.trips_completed}+ trips completed`}`}
      />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-neutral-100">
        <Container className="py-4">
          <nav className="flex items-center text-sm text-neutral-500">
            <Link to="/" className="hover:text-primary-600">Home</Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <Link to="/about" className="hover:text-primary-600">About</Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <Link to="/tour-guides" className="hover:text-primary-600">Tour Guides</Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-neutral-900">{guide.name}</span>
          </nav>
        </Container>
      </div>

      {/* Hero Section */}
      <section className="bg-white py-12">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Image */}
            <div className="lg:col-span-1">
              <div className="relative aspect-square rounded-3xl overflow-hidden bg-neutral-200 shadow-card">
                <img
                  src={guide.image || guide.default_image}
                  alt={guide.name}
                  className="w-full h-full object-cover"
                />
                {guide.is_available_for_hire && (
                  <div className="absolute top-4 left-4">
                    <Badge tone="success">Available for Hire</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="lg:col-span-2">
              <h1 className="font-display text-4xl font-bold text-neutral-900 mb-2">{guide.name}</h1>
              <p className="text-xl text-primary-600 mb-4">{guide.role}</p>

              <div className="flex items-center gap-3 mb-6">
                <RatingStars rating={guide.rating} reviewCount={guide.total_reviews} size="lg" />
              </div>

              {/* Hosted by vendor */}
              {guide.vendor && (
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <Link
                    to={`/vendors/${guide.vendor.slug}`}
                    className="inline-flex items-center gap-3 p-3 bg-white rounded-2xl border border-neutral-100 shadow-card hover:shadow-card-hover transition-all duration-300"
                  >
                    {guide.vendor.avatar ? (
                      <img
                        src={guide.vendor.avatar}
                        alt={guide.vendor.company_name || guide.vendor.name}
                        className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <span className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {(guide.vendor.company_name || guide.vendor.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <div className="text-xs text-neutral-500">Hosted by</div>
                      <div className="text-sm font-semibold text-neutral-900">{guide.vendor.company_name || guide.vendor.name}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400 ml-1" />
                  </Link>
                  <Button variant="secondary" size="sm" onClick={handleMessageHost} loading={messagingHost}>
                    <MessageSquare className="h-4 w-4" />
                    Message host
                  </Button>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-primary-50 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-bold text-primary-600">{guide.trips_completed}+</div>
                  <div className="text-sm text-neutral-600">Trips Completed</div>
                </div>
                <div className="bg-primary-50 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-bold text-primary-600">{guide.rating}</div>
                  <div className="text-sm text-neutral-600">Rating</div>
                </div>
                <div className="bg-primary-50 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-bold text-primary-600">{guide.languages?.length || 0}</div>
                  <div className="text-sm text-neutral-600">Languages</div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 mb-6">
                {guide.email && (
                  <a href={`mailto:${guide.email}`} className="flex items-center text-neutral-600 hover:text-primary-600">
                    <Mail className="h-5 w-5 mr-2" />
                    {guide.email}
                  </a>
                )}
                {guide.phone && (
                  <a href={`tel:${guide.phone}`} className="flex items-center text-neutral-600 hover:text-primary-600">
                    <Phone className="h-5 w-5 mr-2" />
                    {guide.phone}
                  </a>
                )}
              </div>

              {/* Hire Button */}
              <div className="flex flex-wrap items-center gap-3">
                {guide.is_available_for_hire && (
                  <Button variant="primary" size="lg" onClick={() => setShowBookingModal(true)}>
                    Hire for ${guide.hire_price_per_day || ' Negotiable'}/day
                  </Button>
                )}
                <AddToTripButton
                  variant="button"
                  bookableType="tour_guide"
                  bookableId={guide.id}
                  bookableName={guide.name}
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Details Section */}
      <section className="py-12">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Bio */}
              {guide.bio && (
                <Card hoverLift={false} className="p-8">
                  <h2 className="font-display text-2xl font-bold text-neutral-900 mb-4">About</h2>
                  <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap">{guide.bio}</p>
                </Card>
              )}

              {/* Work Experience */}
              <Card hoverLift={false} className="p-8">
                <h2 className="font-display text-2xl font-bold text-neutral-900 mb-6 flex items-center">
                  <Briefcase className="h-6 w-6 mr-2 text-primary-600" />
                  Work Experience
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                      <MapPin className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900">Tour Guide Experience</h3>
                      <p className="text-neutral-600">Completed {guide.trips_completed}+ guided tours</p>
                      <p className="text-sm text-neutral-500 mt-1">Professional tour guide with extensive knowledge of local attractions and history.</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Certifications */}
              {guide.certifications?.length > 0 && (
                <Card hoverLift={false} className="p-8">
                  <h2 className="font-display text-2xl font-bold text-neutral-900 mb-6 flex items-center">
                    <Award className="h-6 w-6 mr-2 text-primary-600" />
                    Certifications
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {guide.certifications.map((cert, i) => (
                      <div key={i} className="flex items-center p-4 bg-neutral-50 rounded-xl">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-neutral-700">{cert}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Languages */}
              {guide.languages?.length > 0 && (
                <Card hoverLift={false} className="p-6">
                  <h3 className="font-display text-lg font-bold text-neutral-900 mb-4 flex items-center">
                    <Globe className="h-5 w-5 mr-2 text-primary-600" />
                    Languages
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {guide.languages.map((lang, i) => (
                      <Badge key={i} tone="primary">{lang}</Badge>
                    ))}
                  </div>
                </Card>
              )}

              {/* Specialties */}
              {guide.specialties?.length > 0 && (
                <Card hoverLift={false} className="p-6">
                  <h3 className="font-display text-lg font-bold text-neutral-900 mb-4 flex items-center">
                    <Star className="h-5 w-5 mr-2 text-primary-600" />
                    Specialties
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {guide.specialties.map((specialty, i) => (
                      <Badge key={i} tone="accent">{specialty}</Badge>
                    ))}
                  </div>
                </Card>
              )}

              {/* Pricing Card */}
              {guide.hire_price_per_day && (
                <div className="bg-primary-600 rounded-3xl p-6 text-white shadow-card">
                  <h3 className="font-display text-lg font-bold mb-2">Hire {guide.name.split(' ')[0]}</h3>
                  <div className="text-3xl font-bold mb-4">
                    ${guide.hire_price_per_day}
                    <span className="text-lg font-normal">/day</span>
                  </div>
                  <ul className="text-sm space-y-2 mb-6">
                    <li className="flex items-center">
                      <Check className="h-4 w-4 mr-2 flex-shrink-0" />
                      Personalized tour
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 mr-2 flex-shrink-0" />
                      Local expertise
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 mr-2 flex-shrink-0" />
                      Flexible itinerary
                    </li>
                  </ul>
                  <Button
                    variant="secondary"
                    fullWidth
                    className="!text-primary-600"
                    onClick={() => setShowBookingModal(true)}
                  >
                    Book Now
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200 flex justify-between items-center">
              <div>
                <h2 className="font-display text-xl font-bold text-neutral-900">Book {guide.name}</h2>
                <p className="text-sm text-neutral-500">{guide.role}</p>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="p-2 hover:bg-neutral-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleBookGuide} className="p-6 space-y-4">
              {bookingMessage && (
                <div className={`p-3 rounded-lg text-sm ${bookingMessage.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {bookingMessage}
                </div>
              )}

              <Input
                label="Booking Date"
                type="date"
                value={bookingForm.booking_date}
                onChange={(e) => setBookingForm(prev => ({ ...prev, booking_date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                required
              />

              <Select
                label="Duration (days)"
                value={bookingForm.duration_days}
                onChange={(e) => setBookingForm(prev => ({ ...prev, duration_days: parseInt(e.target.value) }))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 14, 21, 30].map(days => (
                  <option key={days} value={days}>{days} day{days > 1 ? 's' : ''}</option>
                ))}
              </Select>

              {guide.hire_price_per_day && (
                <div className="p-3 bg-primary-50 rounded-xl">
                  <p className="text-sm text-neutral-600">Estimated Total:</p>
                  <p className="text-lg font-bold text-primary-700">
                    ${guide.hire_price_per_day * bookingForm.duration_days}
                  </p>
                </div>
              )}

              <Textarea
                label="Message (Optional)"
                value={bookingForm.message}
                onChange={(e) => setBookingForm(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
                placeholder="Tell us about your trip plans..."
              />

              {!isAuthenticated && (
                <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg">
                  Please <Link to="/login" className="underline">login</Link> to book a tour guide
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                disabled={bookingLoading || !isAuthenticated}
                loading={bookingLoading}
              >
                {bookingLoading ? 'Sending Request...' : 'Send Booking Request'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TourGuideDetail;
