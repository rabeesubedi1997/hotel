import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Phone, MessageSquare, Check, Send, MapPin, Clock } from 'lucide-react';
import { enquiriesAPI, publicAPI } from '../services/api';
import { Button, Input, Textarea, Select, Card, Container } from '../components/ui';

// Live Kathmandu time — a small, honest, real-time touch (no fabricated
// claims, just a live clock) matching the concierge-desk mockup.
const useKathmanduTime = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const format = () => {
      try {
        const formatter = new Intl.DateTimeFormat([], {
          timeZone: 'Asia/Kathmandu',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        setTime(formatter.format(new Date()) + ' NPT');
      } catch {
        setTime('');
      }
    };
    format();
    const interval = setInterval(format, 1000);
    return () => clearInterval(interval);
  }, []);
  return time;
};

const ContactEnquiry = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const prefillType = queryParams.get('type') || 'general';
  const prefillSubject = queryParams.get('subject') || '';
  const prefillItem = queryParams.get('item') || '';
  const kathmanduTime = useKathmanduTime();

  const [loading, setLoading] = useState(false);
  const [pageContent, setPageContent] = useState(null);
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

  useEffect(() => {
    fetchPageContent();
  }, []);

  const fetchPageContent = async () => {
    try {
      const response = await publicAPI.getPage('contact');
      setPageContent(response.data);
    } catch (err) {
      console.error('Error fetching page content:', err);
    }
  };

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

  const contactInfo = pageContent?.sections?.contact_info || {};

  if (submitted) {
    return (
      <Container className="py-12 max-w-2xl">
        <Card hoverLift={false} className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="font-display text-2xl font-bold text-neutral-900 mb-2">Enquiry Submitted!</h2>
          <p className="text-neutral-600 mb-4">
            Your enquiry number is: <span className="font-semibold text-primary-600">{enquiryNumber}</span>
          </p>
          <p className="text-neutral-500 mb-6">
            Our team will respond to your enquiry within 24 hours.
          </p>
          <div className="flex justify-center gap-4">
            <Button as={Link} to="/" variant="primary">Back to Home</Button>
            <Button as={Link} to="/hotels" variant="secondary">Browse Hotels</Button>
          </div>
        </Card>
      </Container>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Ambient hero */}
      <div className="relative bg-neutral-900 overflow-hidden py-14 sm:py-16">
        <div className="absolute -top-24 -left-16 w-96 h-96 rounded-full bg-primary-500/15 blur-3xl pointer-events-none" />
        <div className="absolute top-6 right-0 w-80 h-80 rounded-full bg-secondary-500/15 blur-3xl pointer-events-none" />
        <Container className="relative">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-primary-300 font-label-caps text-label-caps uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
              Direct Concierge Desk
            </span>
            {kathmanduTime && (
              <span className="text-neutral-300 font-body-sm text-body-sm flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary-400" />
                Kathmandu Time: <span className="font-semibold text-white">{kathmanduTime}</span>
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white max-w-2xl">
            {pageContent?.sections?.hero?.title || 'Contact Us'}
          </h1>
          <p className="text-lg text-neutral-300 max-w-2xl mt-3">
            {pageContent?.sections?.hero?.subtitle || "Have a question? Send us an enquiry and we'll get back to you within 24 hours."}
          </p>
        </Container>
      </div>

      <Container className="py-10 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <Card hoverLift={false} className="lg:col-span-2 p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Full Name *"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your full name"
                />
                <Input
                  label="Email *"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Phone *"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+977 98XXXXXXXX"
                />
                <Select
                  label="Enquiry Type *"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="general">General Question</option>
                  <option value="booking">Booking Support</option>
                  <option value="package">Package Inquiry</option>
                  <option value="custom">Custom Request</option>
                </Select>
              </div>

              <Input
                label="Subject *"
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="What is your enquiry about?"
              />

              <Textarea
                label="Message *"
                rows={5}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Please provide details about your enquiry..."
              />

              <Button type="submit" size="lg" fullWidth loading={loading} disabled={loading}>
                {!loading && <>Send Enquiry <Send className="h-5 w-5" /></>}
              </Button>

              <p className="text-center text-xs text-neutral-500">
                We typically respond within 24 hours.
              </p>
            </form>
          </Card>

          {/* Contact Information */}
          <div className="flex flex-col gap-6">
            <Card hoverLift={false} className="p-6">
              <h3 className="font-headline-sm text-headline-sm font-bold text-neutral-900 mb-4">
                {contactInfo.title || 'Contact Information'}
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium text-neutral-900 text-sm">Address</p>
                    <p className="text-neutral-600 text-sm">{contactInfo.address || 'Thamel, Kathmandu, Nepal'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium text-neutral-900 text-sm">Email</p>
                    <a href={`mailto:${contactInfo.email || 'info@reservenow.com'}`} className="text-neutral-600 text-sm hover:text-primary-600">
                      {contactInfo.email || 'info@reservenow.com'}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium text-neutral-900 text-sm">Phone</p>
                    <a href={`tel:${contactInfo.phone || '+977 1-4444444'}`} className="text-neutral-600 text-sm hover:text-primary-600">
                      {contactInfo.phone || '+977 1-4444444'}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium text-neutral-900 text-sm">Business Hours</p>
                    <p className="text-neutral-600 text-sm">{contactInfo.hours || 'Sunday - Friday: 9:00 AM - 6:00 PM NPT'}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default ContactEnquiry;
