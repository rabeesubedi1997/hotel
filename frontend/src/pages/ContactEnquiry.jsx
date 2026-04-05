import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Phone, User, MessageSquare, Loader2, Check, Send } from 'lucide-react';
import { enquiriesAPI } from '../services/api';

const ContactEnquiry = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const prefillType = queryParams.get('type') || 'general';
  const prefillSubject = queryParams.get('subject') || '';
  const prefillItem = queryParams.get('item') || '';

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: prefillType,
    subject: prefillSubject,
    message: '',
    related_items: prefillItem ? [prefillItem] : [],
  });
  const [submitted, setSubmitted] = useState(false);
  const [enquiryNumber, setEnquiryNumber] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await enquiriesAPI.create(formData);
      setEnquiryNumber(response.data.enquiry_number);
      setSubmitted(true);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit enquiry');
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Enquiry Submitted!</h2>
            <p className="text-gray-600 mb-4">
              Your enquiry number is: <span className="font-semibold text-primary-600">{enquiryNumber}</span>
            </p>
            <p className="text-gray-500 mb-6">
              Our team will respond to your enquiry within 24 hours.
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
              <MessageSquare className="h-8 w-8 mr-3" />
              Contact Us
            </h1>
            <p className="text-primary-100 mt-2">
              Have a question? Send us an enquiry and we'll get back to you within 24 hours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
            <div className="md:col-span-2">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      Full Name *
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      Phone *
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enquiry Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="general">General Question</option>
                      <option value="booking">Booking Support</option>
                      <option value="package">Package Inquiry</option>
                      <option value="custom">Custom Request</option>
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="What is your enquiry about?"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                  <textarea
                    rows="5"
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Please provide details about your enquiry..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Send Enquiry
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-primary-600 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-gray-600">info@reservenow.com</p>
                    <p className="text-gray-600">support@reservenow.com</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-primary-600 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <p className="text-gray-600">+977 1-4444444</p>
                    <p className="text-gray-600">+977 98XXXXXXXX</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MessageSquare className="h-5 w-5 text-primary-600 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Business Hours</p>
                    <p className="text-gray-600">Sunday - Friday</p>
                    <p className="text-gray-600">9:00 AM - 6:00 PM NPT</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactEnquiry;
