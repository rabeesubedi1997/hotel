import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Send, Check, Package } from 'lucide-react';
import { quotesAPI } from '../services/api';
import { Button, Input, Textarea, Select, Card, Container } from '../components/ui';
import { useToast } from '../contexts/ToastContext';

const GetQuote = () => {
  const toast = useToast();
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
      toast.error(error.response?.data?.message || 'Could not send your quote request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Container className="py-12 max-w-2xl">
        <Card hoverLift={false} className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="font-display text-2xl font-bold text-neutral-900 mb-2">Quote Request Submitted!</h2>
          <p className="text-neutral-600 mb-4">
            Your quote number is: <span className="font-semibold text-primary-600">{quoteNumber}</span>
          </p>
          <p className="text-neutral-500 mb-6">
            Our team will review your requirements and send you a customized package quote within 24 hours.
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
    <div className="min-h-screen bg-neutral-50 py-12">
      <Container className="max-w-4xl">
        <Card hoverLift={false} className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary-700 to-primary-600 px-6 sm:px-8 py-6 sm:py-8">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <Package className="h-7 w-7 sm:h-8 sm:w-8" />
              Get a Custom Package Quote
            </h1>
            <p className="text-primary-100 mt-2">
              Tell us your requirements and we'll create a personalized Nepal travel package for you
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
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
              <Input
                label="Phone *"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+977 98XXXXXXXX"
              />
              <Select
                label="Package Type *"
                value={formData.package_type}
                onChange={(e) => setFormData({ ...formData, package_type: e.target.value })}
              >
                {options?.package_types.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Input
                label="Duration (Days) *"
                icon={Calendar}
                type="number"
                min="1"
                max="30"
                required
                value={formData.duration_days}
                onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
              />
              <Input
                label="Travelers *"
                icon={Users}
                type="number"
                min="1"
                max="50"
                required
                value={formData.travelers}
                onChange={(e) => setFormData({ ...formData, travelers: parseInt(e.target.value) })}
              />
              <Input
                label="Start Date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <Textarea
              label="Special Requirements"
              rows={4}
              required
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              placeholder="Tell us about your preferred destinations, activities, dietary requirements, or any special requests..."
            />

            <Input
              label="Estimated Budget (USD)"
              type="number"
              min="0"
              value={formData.estimated_budget}
              onChange={(e) => setFormData({ ...formData, estimated_budget: e.target.value })}
              placeholder="Optional - helps us tailor the package"
            />

            <Button type="submit" size="lg" fullWidth loading={loading} disabled={loading}>
              {!loading && <>Get My Quote <Send className="h-5 w-5" /></>}
            </Button>
          </form>
        </Card>
      </Container>
    </div>
  );
};

export default GetQuote;
