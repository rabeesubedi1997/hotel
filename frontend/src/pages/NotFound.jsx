import { Link } from 'react-router-dom';
import { Compass, Home, Building2, Mountain } from 'lucide-react';
import SEO from '../components/SEO';
import { Button, Container } from '../components/ui';

// Shown for any URL that doesn't match a route — previously those rendered
// a blank page under the site header.
const NotFound = ({ homePath = '/', homeLabel = 'Back to home' }) => (
  <Container className="py-20 sm:py-28">
    <SEO title="Page not found" noindex />
    <div className="max-w-lg mx-auto text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 mb-6">
        <Compass className="h-8 w-8" />
      </span>
      <p className="text-sm font-semibold text-primary-600 mb-2">404</p>
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-3">We couldn&apos;t find that page</h1>
      <p className="text-neutral-600 mb-8">
        The link may be old, or the page may have moved. Try one of these instead.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button as={Link} to={homePath}>
          <Home className="h-4 w-4" /> {homeLabel}
        </Button>
        {homePath === '/' && (
          <>
            <Button as={Link} to="/hotels" variant="secondary">
              <Building2 className="h-4 w-4" /> Browse hotels
            </Button>
            <Button as={Link} to="/activities" variant="secondary">
              <Mountain className="h-4 w-4" /> Browse activities
            </Button>
          </>
        )}
      </div>
    </div>
  </Container>
);

export default NotFound;
