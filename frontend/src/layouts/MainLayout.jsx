import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import useAuthStore from '../stores/authStore';
import useSiteSettingsStore from '../stores/siteSettingsStore';
import useNotificationStore from '../stores/notificationStore';
import useCurrencyStore from '../stores/currencyStore';
import NotificationBell from '../components/NotificationBell';
import FloatingChatWidget from '../components/FloatingChatWidget';
import { getSystemHomeRoute } from '../utils/systemAccess';

const MainLayout = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const {
    settings,
    fetchSettings,
    getSiteName,
    getSiteTagline,
    getHeaderMenu,
    getFooterMenu,
    getContactInfo,
    getSocialLinks,
    getFooterDescription,
    isFooterNewsletterEnabled,
    getFooterNewsletterHeading,
    getFooterDirectory,
    getFooterPaymentMethods,
    getFooterCopyrightText,
  } = useSiteSettingsStore();
  const { fetchUnreadCount, subscribe, unsubscribe } = useNotificationStore();
  const { rates, selected: selectedCurrency, setCurrency, fetchRates } = useCurrencyStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchRates();
  }, []);

  // Live notification bell — fetch the unread count on load and subscribe
  // to this user's private Reverb channel while logged in.
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchUnreadCount();
      subscribe(user.id);
    }
    return () => unsubscribe();
  }, [isAuthenticated, user?.id]);

  // Condense the header once the page scrolls past the hero — a small
  // premium touch real travel sites lean on (Airbnb/Booking.com both do
  // this) instead of a fixed-height header everywhere.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    // No mailing-list backend exists yet — acknowledge locally rather than
    // claiming the address was saved anywhere.
    setNewsletterSubmitted(true);
    setNewsletterEmail('');
  };

  const siteName = getSiteName();
  const siteTagline = getSiteTagline();
  const headerMenu = getHeaderMenu();
  const footerMenu = getFooterMenu();
  const contactInfo = getContactInfo();
  const socialLinks = getSocialLinks();
  const activeSocialLinks = Object.entries(socialLinks).filter(([, url]) => url);
  const footerDescription = getFooterDescription();
  const footerNewsletterEnabled = isFooterNewsletterEnabled();
  const footerNewsletterHeading = getFooterNewsletterHeading();
  const footerDirectory = getFooterDirectory();
  const footerPaymentMethods = getFooterPaymentMethods();
  const footerCopyrightText = getFooterCopyrightText();

  const getIcon = (iconName) => {
    const Icon = LucideIcons[iconName] || LucideIcons.Circle;
    return Icon;
  };

  // Lucide dropped brand logos, so real per-platform marks are drawn as
  // small inline SVGs instead of falling back to one generic chain-link
  // icon for every network.
  const SOCIAL_ICONS = {
    facebook: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.91h-2.33V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
      </svg>
    ),
    instagram: (props) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
    twitter: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.9L4.4 22H1.3l8.1-9.3L1 2h7l4.9 6.3L18.9 2Zm-1.2 18h1.9L6.4 4H4.3l13.4 16Z" />
      </svg>
    ),
    youtube: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M23 12s0-3.5-.45-5.2a2.9 2.9 0 0 0-2-2C18.9 4.3 12 4.3 12 4.3s-6.9 0-8.55.5a2.9 2.9 0 0 0-2 2C1 8.5 1 12 1 12s0 3.5.45 5.2a2.9 2.9 0 0 0 2 2c1.65.5 8.55.5 8.55.5s6.9 0 8.55-.5a2.9 2.9 0 0 0 2-2C23 15.5 23 12 23 12ZM9.8 15.5V8.5l6.2 3.5-6.2 3.5Z" />
      </svg>
    ),
  };

  const isActivePath = (url) => location.pathname === url;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header
        className={`bg-white/95 backdrop-blur-xl sticky top-0 z-50 transition-shadow duration-300 ${
          scrolled ? 'shadow-md' : 'shadow-[0_1px_8px_rgba(20,28,40,0.04)]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`flex justify-between items-center gap-6 transition-[height] duration-300 ${
              scrolled ? 'h-14 md:h-16' : 'h-16 md:h-20'
            }`}
          >
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 shrink-0 group" onClick={closeMobileMenu}>
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                <LucideIcons.Mountain className="h-6 w-6" />
              </div>
              <div className="hidden sm:flex flex-col leading-none">
                <span className="font-display text-lg font-bold tracking-tight text-neutral-900">{siteName}</span>
                {siteTagline && (
                  <span className="hidden xl:block font-label-caps text-label-caps text-primary-600 tracking-wider uppercase mt-1 truncate max-w-[14rem]">
                    {siteTagline}
                  </span>
                )}
              </div>
            </Link>

            {/* Desktop Navigation — pill highlight on the active route */}
            <nav className="hidden lg:flex items-center gap-1">
              {headerMenu.map((item) => {
                const MenuIcon = getIcon(item.icon);
                const active = isActivePath(item.url);
                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    className={`px-2.5 xl:px-3.5 py-1.5 rounded-full font-label-md text-label-md flex items-center whitespace-nowrap transition-colors ${
                      active
                        ? 'text-primary-600 font-semibold bg-neutral-100'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {item.icon && <MenuIcon className="hidden 2xl:block h-4 w-4 mr-1.5" />}
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop User Actions */}
            <div className="hidden md:flex items-center gap-3 xl:gap-4 shrink-0">
              <div className="hidden sm:block relative">
                <button
                  type="button"
                  onClick={() => setCurrencyMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-sm font-medium transition-colors"
                >
                  <LucideIcons.Banknote className="h-4 w-4" />
                  <span>{selectedCurrency}</span>
                  <LucideIcons.ChevronDown className="h-3.5 w-3.5" />
                </button>
                {currencyMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setCurrencyMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-card-hover border border-neutral-100 py-1 z-20">
                      {rates.map((r) => (
                        <button
                          key={r.code}
                          type="button"
                          onClick={() => { setCurrency(r.code); setCurrencyMenuOpen(false); }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 flex items-center justify-between ${
                            selectedCurrency === r.code ? 'text-primary-600 font-semibold' : 'text-neutral-700'
                          }`}
                        >
                          <span>{r.code}</span>
                          <span className="text-neutral-400">{r.symbol}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => navigate('/hotels')}
                aria-label="Search stays and adventures"
                className="hidden xl:flex w-9 h-9 rounded-full items-center justify-center text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                type="button"
              >
                <LucideIcons.Search className="h-5 w-5" />
              </button>

              {isAuthenticated ? (
                <>
                  {/* Dashboard button — role based. Previously only
                      admin/manager/super_admin saw this at all, so a
                      vendor had no header entry point into their own
                      panel; now everyone with either system gets sent to
                      the right place (see utils/systemAccess.js). */}
                  {user && ['admin', 'manager', 'super_admin', 'vendor'].includes(user.role) && (
                    <button
                      onClick={() => navigate(getSystemHomeRoute(user.role))}
                      className="flex items-center gap-2 px-3 2xl:px-4 py-2 bg-neutral-900 text-white rounded-full text-sm font-semibold hover:bg-neutral-800 transition-colors whitespace-nowrap"
                      title={user.role === 'vendor' ? 'Vendor Dashboard' : 'Admin Dashboard'}
                    >
                      <LucideIcons.Settings className="h-4 w-4" />
                      <span className="hidden 2xl:inline">{user.role === 'vendor' ? 'Vendor Dashboard' : 'Admin Dashboard'}</span>
                      <span className="2xl:hidden">Dashboard</span>
                    </button>
                  )}
                  <Link to="/wishlist" aria-label="My wishlist" title="My wishlist" className="text-neutral-600 hover:text-accent-600 transition-colors">
                    <LucideIcons.Heart className="h-6 w-6" />
                  </Link>
                  <NotificationBell />
                  <div className="relative group">
                    <button type="button" aria-haspopup="menu" aria-label="Account menu" className="flex items-center gap-2 text-neutral-700 hover:text-primary-600 border border-neutral-200 rounded-full pl-1.5 2xl:pl-3 pr-1.5 py-1.5 transition-colors">
                      <span className="hidden 2xl:block text-sm font-medium max-w-[8rem] truncate">{user?.name}</span>
                      <span className="h-7 w-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                        {user?.name?.charAt(0)}
                      </span>
                    </button>
                    {/* pt-2 bridge (not mt-2) so the pointer can travel from the button into the menu without it closing */}
                    <div className="absolute right-0 top-full pt-2 w-52 hidden group-hover:block group-focus-within:block z-20">
                    <div className="bg-white rounded-xl shadow-card-hover border border-neutral-100 py-1">
                      <p className="px-4 pt-2 pb-2 mb-1 border-b border-neutral-100 text-sm font-semibold text-neutral-900 truncate">{user?.name}</p>
                      <Link to="/profile" className="block px-4 py-2 text-neutral-700 hover:bg-neutral-50">
                        Profile
                      </Link>
                      <Link to="/wishlist" className="block px-4 py-2 text-neutral-700 hover:bg-neutral-50">
                        My Wishlist
                      </Link>
                      <Link to="/loyalty" className="block px-4 py-2 text-neutral-700 hover:bg-neutral-50">
                        Rewards & Points
                      </Link>
                      <Link to="/trip-planner" className="block px-4 py-2 text-neutral-700 hover:bg-neutral-50">
                        My Trips
                      </Link>
                      <Link to="/messages" className="block px-4 py-2 text-neutral-700 hover:bg-neutral-50">
                        Messages
                      </Link>
                      <Link to="/bookings" className="block px-4 py-2 text-neutral-700 hover:bg-neutral-50">
                        My Bookings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-neutral-700 hover:bg-neutral-50 flex items-center"
                      >
                        <LucideIcons.LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </button>
                    </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="hidden lg:inline font-label-md text-label-md text-neutral-600 hover:text-neutral-900"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="hidden xl:inline font-label-md text-label-md text-neutral-600 hover:text-neutral-900"
                  >
                    Sign up
                  </Link>
                  <Link
                    to="/quote"
                    className="inline-flex items-center gap-2 px-4 xl:px-5 py-2.5 whitespace-nowrap rounded-full bg-primary-600 text-white font-label-md text-label-md shadow-[0_4px_14px_rgba(0,95,80,0.25)] hover:bg-primary-700 transition-all"
                  >
                    <span>Plan My Trip</span>
                    <LucideIcons.ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 text-neutral-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <LucideIcons.X className="h-6 w-6" /> : <LucideIcons.Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed top-16 md:top-20 left-0 right-0 z-50 bg-white border-t shadow-lg">
            <div className="overflow-y-auto px-4 pt-2 pb-4 space-y-1 max-h-[calc(100vh-4rem)] overscroll-contain overscroll-behavior-y-auto">
              {headerMenu.map((item) => (
                <Link
                  key={item.url}
                  to={item.url}
                  className={`block px-3 py-2 rounded-md ${
                    isActivePath(item.url) ? 'text-primary-600 font-semibold bg-neutral-100' : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </Link>
              ))}

              {rates.length > 1 && (
                <div className="md:hidden px-3 py-3 border-y border-neutral-100 my-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">Currency</p>
                  <div className="flex flex-wrap gap-2">
                    {rates.map((r) => (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => setCurrency(r.code)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          selectedCurrency === r.code
                            ? 'bg-primary-600 border-primary-600 text-white'
                            : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
                        }`}
                      >
                        {r.code} <span className="opacity-70">{r.symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isAuthenticated ? (
                <>
                  {/* Dashboard Button - Mobile (see desktop version above) */}
                  {user && ['admin', 'manager', 'super_admin', 'vendor'].includes(user.role) && (
                <button
                  onClick={() => { navigate(getSystemHomeRoute(user.role)); closeMobileMenu(); }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <LucideIcons.Settings className="h-4 w-4" />
                  <span>{user.role === 'vendor' ? 'Vendor Dashboard' : 'Admin Dashboard'}</span>
                </button>
              )}

              <Link
                to="/profile"
                className="block px-3 py-2 text-neutral-700 hover:bg-neutral-100 rounded-md"
                onClick={closeMobileMenu}
              >
                Profile
              </Link>
              <Link
                to="/bookings"
                className="block px-3 py-2 text-neutral-700 hover:bg-neutral-100 rounded-md"
                onClick={closeMobileMenu}
              >
                My Bookings
              </Link>
              <Link
                to="/wishlist"
                className="block px-3 py-2 text-neutral-700 hover:bg-neutral-100 rounded-md"
                onClick={closeMobileMenu}
              >
                Wishlist
              </Link>
              <Link
                to="/loyalty"
                className="block px-3 py-2 text-neutral-700 hover:bg-neutral-100 rounded-md"
                onClick={closeMobileMenu}
              >
                Rewards & Points
              </Link>
              <Link
                to="/trip-planner"
                className="block px-3 py-2 text-neutral-700 hover:bg-neutral-100 rounded-md"
                onClick={closeMobileMenu}
              >
                My Trips
              </Link>
              <Link
                to="/messages"
                className="block px-3 py-2 text-neutral-700 hover:bg-neutral-100 rounded-md"
                onClick={closeMobileMenu}
              >
                Messages
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-neutral-700 hover:bg-neutral-100 rounded-md flex items-center"
              >
                <LucideIcons.LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block px-3 py-2 text-neutral-700 hover:bg-neutral-100 rounded-md"
                    onClick={closeMobileMenu}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block px-3 py-2 text-neutral-700 hover:bg-neutral-100 rounded-md"
                    onClick={closeMobileMenu}
                  >
                    Sign up
                  </Link>
                  <Link
                    to="/quote"
                    className="block px-3 py-2 text-primary-600 font-semibold hover:bg-neutral-100 rounded-md"
                    onClick={closeMobileMenu}
                  >
                    Plan My Trip
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer — every section below (newsletter copy, brand blurb, quick
          links, directory grid, payment badges, copyright) is sourced from
          Site Settings > Footer in the admin dashboard, so content changes
          never need a code deploy. */}
      <footer className="relative w-full bg-neutral-900 text-white mt-space-3xl overflow-hidden">
        {/* Subtle top accent + ambient glow so the footer reads as a
            designed surface rather than a flat gray block. */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/60 to-transparent" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-[20rem] bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-space-2xl pb-space-xl">
          {/* Newsletter */}
          {footerNewsletterEnabled && (
            <div className="p-6 sm:p-8 lg:p-10 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md mb-space-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="max-w-xl flex items-start gap-4">
                <div className="hidden sm:flex w-12 h-12 rounded-xl bg-primary-500/15 items-center justify-center shrink-0">
                  <LucideIcons.Mail className="h-5 w-5 text-primary-300" />
                </div>
                <div>
                  <span className="font-label-caps text-label-caps text-primary-300 uppercase tracking-widest">Stay in the loop</span>
                  <h3 className="font-headline-sm text-headline-sm font-bold mt-2">{footerNewsletterHeading}</h3>
                </div>
              </div>
              {newsletterSubmitted ? (
                <p className="text-primary-300 font-medium flex items-center gap-2">
                  <LucideIcons.CheckCircle2 className="h-5 w-5" /> Thanks! We'll be in touch.
                </p>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch gap-3 min-w-0 lg:min-w-[360px]">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Your email address"
                    className="w-full px-5 py-3 rounded-xl bg-white/10 text-white placeholder-neutral-400 text-sm outline-none focus:bg-white/15 transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-400 text-white font-label-md text-label-md whitespace-nowrap transition-colors flex items-center justify-center gap-2"
                  >
                    Subscribe
                    <LucideIcons.Check className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 pb-space-xl">
            {/* Brand column */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-primary-300">
                  <LucideIcons.Mountain className="h-5 w-5" />
                </div>
                <span className="font-display text-lg font-bold tracking-tight">{siteName}</span>
              </div>
              <p className="font-body-md text-body-md text-neutral-400 max-w-sm leading-relaxed">
                {footerDescription}
              </p>
              {activeSocialLinks.length > 0 && (
                <div className="flex items-center gap-3 mt-1">
                  {activeSocialLinks.map(([platform, url]) => {
                    const SocialIcon = SOCIAL_ICONS[platform] || LucideIcons.Link2;
                    return (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={platform}
                        title={platform}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-primary-600 flex items-center justify-center transition-colors"
                      >
                        <SocialIcon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </div>
              )}
              {/* Trust strip — quick reassurance signals that pair well with
                  the payment badges lower in the footer. */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-2 pt-4 border-t border-white/10">
                <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <LucideIcons.ShieldCheck className="h-4 w-4 text-primary-300" /> Secure booking
                </span>
                <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <LucideIcons.Headset className="h-4 w-4 text-primary-300" /> 24/7 concierge
                </span>
                <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <LucideIcons.BadgeCheck className="h-4 w-4 text-primary-300" /> Verified partners
                </span>
              </div>
            </div>

            {/* Quick Links (CMS-driven) */}
            <div className="flex flex-col gap-4">
              <h4 className="font-headline-sm text-headline-sm font-semibold">Quick Links</h4>
              <div className="flex flex-col gap-3 font-body-md text-body-md text-neutral-400">
                {footerMenu.map((item) => (
                  <Link key={item.url} to={item.url} className="hover:text-white transition-colors w-fit">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Contact / Concierge desk */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <h4 className="font-headline-sm text-headline-sm font-semibold">Concierge Desk</h4>
              <div className="flex flex-col gap-3 font-body-md text-body-md text-neutral-400">
                {contactInfo.address && (
                  <div className="flex items-start gap-2.5">
                    <LucideIcons.MapPin className="h-[18px] w-[18px] text-primary-300 mt-0.5 shrink-0" />
                    <span>{contactInfo.address}</span>
                  </div>
                )}
                {contactInfo.phone && (
                  <div className="flex items-center gap-2.5">
                    <LucideIcons.Phone className="h-[18px] w-[18px] text-primary-300 shrink-0" />
                    <a href={`tel:${contactInfo.phone.replace(/[^\d+]/g, '')}`} className="hover:text-white transition-colors">{contactInfo.phone}</a>
                  </div>
                )}
                {contactInfo.email && (
                  <div className="flex items-center gap-2.5">
                    <LucideIcons.Mail className="h-[18px] w-[18px] text-primary-300 shrink-0" />
                    <a href={`mailto:${contactInfo.email}`} className="hover:text-white transition-colors break-all">{contactInfo.email}</a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Department-style directory (admin-editable via footer_directory) —
              same single concierge contact, grouped by product line so it
              reads like the multi-department support rows competitor OTA
              sites show, without inventing per-department phone numbers this
              business doesn't have. */}
          {footerDirectory.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5 py-8 border-t border-white/10">
              {footerDirectory.map((dept) => (
                <div key={dept.label} className="flex flex-col gap-1">
                  <Link to={dept.url} className="font-semibold text-white text-sm hover:text-primary-300 transition-colors w-fit">
                    {dept.label}
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Payment trust row (admin-editable via footer_payment_methods) */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-6 border-t border-white/10">
            {footerPaymentMethods.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs uppercase tracking-wider text-neutral-500 mr-1">We accept</span>
                {footerPaymentMethods.map((method) => (
                  <span key={method} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-300 text-xs font-medium">
                    {method}
                  </span>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Back to top
              <LucideIcons.ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="pt-8 mt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-neutral-400 font-body-sm text-body-sm">
            <span>© {new Date().getFullYear()} {siteName}. {footerCopyrightText}</span>
            {footerMenu.length > 0 && (
              <div className="flex items-center gap-4">
                {footerMenu.slice(0, 3).map((item) => (
                  <Link key={item.url} to={item.url} className="hover:text-white transition-colors">
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </footer>

      <FloatingChatWidget />
    </div>
  );
};

export default MainLayout;
