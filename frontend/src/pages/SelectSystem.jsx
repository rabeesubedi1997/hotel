import { useNavigate } from 'react-router-dom';
import { Calendar, Building2, ArrowRight, LogOut } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import SEO from '../components/SEO';
import { Container } from '../components/ui';

const SYSTEMS = [
  {
    key: 'booking',
    path: '/admin',
    icon: Calendar,
    tone: 'primary',
    title: 'Booking System',
    description: 'The marketplace-wide admin — every booking, user, listing and site setting, across all vendors.',
    bullets: ['All hotels & activities', 'Customer bookings & payments', 'Site-wide settings & approvals'],
  },
  {
    key: 'management',
    path: '/select-vendor',
    icon: Building2,
    tone: 'secondary',
    title: 'Management System',
    description: "Step into a specific vendor's own panel — their hotels, activities, tour guides, restaurant POS and bookings.",
    bullets: ['One vendor at a time', 'Restaurant POS & kitchen board', 'Acts exactly as that vendor would'],
  },
];

const TONE_STYLES = {
  primary: {
    iconWrap: 'bg-primary-50 text-primary-700 group-hover:bg-primary-600 group-hover:text-white',
    ring: 'group-hover:ring-primary-200',
    arrow: 'text-primary-600',
    bullet: 'bg-primary-500',
  },
  secondary: {
    iconWrap: 'bg-secondary-50 text-secondary-700 group-hover:bg-secondary-600 group-hover:text-white',
    ring: 'group-hover:ring-secondary-200',
    arrow: 'text-secondary-600',
    bullet: 'bg-secondary-500',
  },
};

/**
 * Shown right after login only to users who qualify for more than one
 * system (see utils/systemAccess.js) — currently that's every admin-level
 * user, since they can both run the marketplace-wide Booking System and
 * step into any vendor's Management System. A plain vendor never sees
 * this screen; they go straight to their own panel.
 */
const SelectSystem = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <SEO title="Choose a System" noindex />

      <Container className="max-w-4xl py-16 sm:py-24">
        <div className="text-center mb-12">
          <span className="inline-block text-primary-600 font-semibold uppercase text-xs tracking-widest mb-3">
            Signed in as {user?.name}
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900">Which system do you want to work in?</h1>
          <p className="text-neutral-500 mt-3">Pick a workspace — you can switch between them any time.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {SYSTEMS.map(({ key, path, icon: Icon, tone, title, description, bullets }) => {
            const styles = TONE_STYLES[tone];
            return (
              <button
                key={key}
                type="button"
                onClick={() => navigate(path)}
                className={`group text-left bg-white rounded-3xl border border-neutral-200 p-8 shadow-card
                  transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:ring-4 ${styles.ring}`}
              >
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${styles.iconWrap}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h2 className="font-display text-xl font-semibold text-neutral-900 mb-2">{title}</h2>
                <p className="text-sm text-neutral-500 mb-5 leading-relaxed">{description}</p>
                <ul className="space-y-1.5 mb-6">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs text-neutral-600">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${styles.bullet}`} />
                      {b}
                    </li>
                  ))}
                </ul>
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${styles.arrow}`}>
                  Enter <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </Container>
    </div>
  );
};

export default SelectSystem;
