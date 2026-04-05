import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Users, MapPin, Loader2, Send, Check, Package } from 'lucide-react';
import { quotesAPI } from '../services/api';
import useAuthStore from '../stores/authStore';

const GetQuote = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    package_type: 'adventure',
    duration_days: 7,
    travelers: 2,
    start_date: '',
    requirements: '',
    preferred_activities: [],
    preferred_hotels: [],
    estimated_budget: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState('');

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const response = await quotesAPI.getPackageOptions();
      setOptions(response.data);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await quotesAPI.create(formData);
      setQuoteNumber(response.data.quote_number);
      setSubmitted(true);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit quote request');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quote Request Submitted!</h2>
            <p className="text-gray-600 mb-4">
              Your quote number is: <span className="font-semibold text-primary-600">{quoteNumber}</span>
            </p>
            <p className="text-gray-500 mb-6">
              Our team will review your requirements and send you a customized package quote within 24 hours.
            </p>
            <div className="flex justify-center space-x-4">
              <Link to="/" className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Back to Home
              </Link>
              <Link to="/hotels" className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                Browse Hotels
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-primary-600 px-8 py-6">
            <h1 className="text-3xl font-bold text-white flex items-center">
              <Package className="h-8 w-8 mr-3" />
              Get a Custom Package Quote
            </h1>
            <p className="text-primary-100 mt-2">
              Tell us your requirements and we'll create a personalized Nepal travel package for you
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="+977 98XXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Package Type *</label>
                <select
                  value={formData.package_type}
                  onChange={(e) => setFormData({ ...formData, package_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {options?.package_types.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Duration (Days) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  Travelers *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={formData.travelers}
                  onChange={(e) => setFormData({ ...formData, travelers: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
              <textarea
                rows="4"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="Tell us about your preferred destinations, activities, dietary requirements, or any special requests..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Budget (USD)</label>
              <input
                type="number"
                min="0"
                value={formData.estimated_budget}
                onChange={(e) => setFormData({ ...formData, estimated_budget: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Optional - helps us tailor the package"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Get My Quote
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GetQuote;
