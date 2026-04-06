import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { publicAPI, enquiriesAPI } from '../services/api';
import SEO from '../components/SEO';
import useAuthStore from '../stores/authStore';

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
  const { isAuthenticated } = useAuthStore();

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

  const renderStarRating = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <LucideIcons.Star 
            key={i} 
            className={`h-5 w-5 ${
              i < fullStars 
                ? 'text-yellow-400 fill-yellow-400' 
                : i === fullStars && hasHalfStar 
                  ? 'text-yellow-400 fill-yellow-400/50' 
                  : 'text-gray-300'
            }`} 
          />
        ))}
      </div>
    );
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tour Guide</h1>
          <p className="text-gray-600 mb-6">{error || 'Not found'}</p>
          <Link to="/tour-guides" className="text-primary-600 hover:underline">View All Guides</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO 
        title={`${guide.name} - Tour Guide - ReserveNow`}
        description={`${guide.bio?.substring(0, 160) || `Professional tour guide with ${guide.trips_completed}+ trips completed`}`}
      />

      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center text-sm text-gray-500">
            <Link to="/" className="hover:text-primary-600">Home</Link>
            <LucideIcons.ChevronRight className="h-4 w-4 mx-2" />
            <Link to="/about" className="hover:text-primary-600">About</Link>
            <LucideIcons.ChevronRight className="h-4 w-4 mx-2" />
            <Link to="/tour-guides" className="hover:text-primary-600">Tour Guides</Link>
            <LucideIcons.ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-gray-900">{guide.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Image */}
            <div className="lg:col-span-1">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-200">
                <img 
                  src={guide.image || guide.default_image} 
                  alt={guide.name} 
                  className="w-full h-full object-cover"
                />
                {guide.is_available_for_hire && (
                  <div className="absolute top-4 left-4 px-4 py-2 bg-green-500 text-white font-medium rounded-full">
                    Available for Hire
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="lg:col-span-2">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{guide.name}</h1>
              <p className="text-xl text-primary-600 mb-4">{guide.role}</p>
              
              <div className="flex items-center gap-4 mb-6">
                {renderStarRating(guide.rating)}
                <span className="text-gray-600">({guide.total_reviews} reviews)</span>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-primary-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-primary-600">{guide.trips_completed}+</div>
                  <div className="text-sm text-gray-600">Trips Completed</div>
                </div>
                <div className="bg-primary-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-primary-600">{guide.rating}</div>
                  <div className="text-sm text-gray-600">Rating</div>
                </div>
                <div className="bg-primary-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-primary-600">{guide.languages?.length || 0}</div>
                  <div className="text-sm text-gray-600">Languages</div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 mb-6">
                {guide.email && (
                  <a href={`mailto:${guide.email}`} className="flex items-center text-gray-600 hover:text-primary-600">
                    <LucideIcons.Mail className="h-5 w-5 mr-2" />
                    {guide.email}
                  </a>
                )}
                {guide.phone && (
                  <a href={`tel:${guide.phone}`} className="flex items-center text-gray-600 hover:text-primary-600">
                    <LucideIcons.Phone className="h-5 w-5 mr-2" />
                    {guide.phone}
                  </a>
                )}
              </div>

              {/* Hire Button */}
              {guide.is_available_for_hire && (
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="px-8 py-4 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Hire for ${guide.hire_price_per_day || ' Negotiable'}/day
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Details Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Bio */}
              {guide.bio && (
                <div className="bg-white rounded-2xl p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{guide.bio}</p>
                </div>
              )}

              {/* Work Experience */}
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <LucideIcons.Briefcase className="h-6 w-6 mr-2 text-primary-600" />
                  Work Experience
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <LucideIcons.MapPin className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Tour Guide Experience</h3>
                      <p className="text-gray-600">Completed {guide.trips_completed}+ guided tours</p>
                      <p className="text-sm text-gray-500 mt-1">Professional tour guide with extensive knowledge of local attractions and history.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Certifications */}
              {guide.certifications?.length > 0 && (
                <div className="bg-white rounded-2xl p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <LucideIcons.Award className="h-6 w-6 mr-2 text-primary-600" />
                    Certifications
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {guide.certifications.map((cert, i) => (
                      <div key={i} className="flex items-center p-4 bg-gray-50 rounded-lg">
                        <LucideIcons.CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                        <span className="text-gray-700">{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Languages */}
              {guide.languages?.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <LucideIcons.Globe className="h-5 w-5 mr-2 text-primary-600" />
                    Languages
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {guide.languages.map((lang, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Specialties */}
              {guide.specialties?.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <LucideIcons.Star className="h-5 w-5 mr-2 text-primary-600" />
                    Specialties
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {guide.specialties.map((specialty, i) => (
                      <span key={i} className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing Card */}
              {guide.hire_price_per_day && (
                <div className="bg-primary-600 rounded-2xl p-6 text-white">
                  <h3 className="text-lg font-bold mb-2">Hire {guide.name.split(' ')[0]}</h3>
                  <div className="text-3xl font-bold mb-4">
                    ${guide.hire_price_per_day}
                    <span className="text-lg font-normal">/day</span>
                  </div>
                  <ul className="text-sm space-y-2 mb-6">
                    <li className="flex items-center">
                      <LucideIcons.Check className="h-4 w-4 mr-2" />
                      Personalized tour
                    </li>
                    <li className="flex items-center">
                      <LucideIcons.Check className="h-4 w-4 mr-2" />
                      Local expertise
                    </li>
                    <li className="flex items-center">
                      <LucideIcons.Check className="h-4 w-4 mr-2" />
                      Flexible itinerary
                    </li>
                  </ul>
                  <button
                    onClick={() => setShowBookingModal(true)}
                    className="w-full py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Book Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Book {guide.name}</h2>
                <p className="text-sm text-gray-500">{guide.role}</p>
              </div>
              <button 
                onClick={() => setShowBookingModal(false)} 
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <LucideIcons.X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleBookGuide} className="p-6 space-y-4">
              {bookingMessage && (
                <div className={`p-3 rounded-lg text-sm ${bookingMessage.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {bookingMessage}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Booking Date</label>
                <input
                  type="date"
                  value={bookingForm.booking_date}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, booking_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                <select
                  value={bookingForm.duration_days}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, duration_days: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 14, 21, 30].map(days => (
                    <option key={days} value={days}>{days} day{days > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              {guide.hire_price_per_day && (
                <div className="p-3 bg-primary-50 rounded-lg">
                  <p className="text-sm text-gray-600">Estimated Total:</p>
                  <p className="text-lg font-bold text-primary-700">
                    ${guide.hire_price_per_day * bookingForm.duration_days}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
                <textarea
                  value={bookingForm.message}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                  placeholder="Tell us about your trip plans..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {!isAuthenticated && (
                <div className="p-3 bg-yellow-50 text-yellow-700 text-sm rounded-lg">
                  Please <Link to="/login" className="underline">login</Link> to book a tour guide
                </div>
              )}

              <button
                type="submit"
                disabled={bookingLoading || !isAuthenticated}
                className="w-full py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bookingLoading ? 'Sending Request...' : 'Send Booking Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TourGuideDetail;
