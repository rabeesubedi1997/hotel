import { useNavigate } from 'react-router-dom';
import { Calendar, Building2 } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import SEO from '../components/SEO';
import { Container, Card } from '../components/ui';

/**
 * Shown right after login only to users who qualify for more than one
 * system (see utils/systemAccess.js) — currently that's every admin-level
 * user, since they can both run the marketplace-wide Booking System and
 * step into any vendor's Management System. A plain vendor never sees
 * this screen; they go straight to their own panel.
 */
const SelectSystem = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <Container className="max-w-3xl py-16">
      <SEO title="Choose a System" noindex />

      <div className="text-center mb-10">
        <h1 className="font-display text-3xl font-bold text-neutral-900">Welcome back, {user?.name}</h1>
        <p className="text-neutral-600 mt-2">Which system do you want to work in?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card
          hoverLift
          className="p-8 text-center cursor-pointer"
          onClick={() => navigate('/admin')}
        >
          <div className="h-16 w-16 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8" />
          </div>
          <h2 className="font-display text-xl font-semibold text-neutral-900 mb-2">Booking System</h2>
          <p className="text-sm text-neutral-500">
            The marketplace-wide admin — all bookings, users, listings, and site settings.
          </p>
        </Card>

        <Card
          hoverLift
          className="p-8 text-center cursor-pointer"
          onClick={() => navigate('/select-vendor')}
        >
          <div className="h-16 w-16 rounded-2xl bg-secondary-100 text-secondary-700 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8" />
          </div>
          <h2 className="font-display text-xl font-semibold text-neutral-900 mb-2">Management System</h2>
          <p className="text-sm text-neutral-500">
            Operate a specific vendor's own panel — their hotels, activities, tour guides, and bookings.
          </p>
        </Card>
      </div>
    </Container>
  );
};

export default SelectSystem;
