import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Building2, Compass, Calendar, LogOut, Menu, MessageSquare, X, Users as GuidesIcon, UserCog, LogOut as ExitIcon, UtensilsCrossed } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import useNotificationStore from '../stores/notificationStore';
import useActingVendorStore from '../stores/actingVendorStore';
import NotificationBell from '../components/NotificationBell';
import SEO from '../components/SEO';

const ADMIN_LEVEL_ROLES = ['admin', 'manager', 'super_admin'];

const VendorLayout = () => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const { fetchUnreadCount, subscribe, unsubscribe } = useNotificationStore();
  const { vendorId, vendorName, clearActingVendor } = useActingVendorStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdminLevel = ADMIN_LEVEL_ROLES.includes(user?.role);

  // The vendor's own business name where possible, so the panel doesn't
  // read as a generic shell — falls back to the acting-vendor label for
  // admins managing someone else's panel, and to "Vendor Portal" only if
  // neither is known yet.
  const displayName = isAdminLevel
    ? (vendorName || 'Vendor Portal')
    : (user?.company_name || user?.name || 'Vendor Portal');

  // Redirect to login if not authenticated; allow vendors into their own
  // panel, and admin-level users into the Management System — but only
  // once they've picked which vendor to manage (see SelectVendor.jsx).
  useEffect(() => {
    // Always replace, not push — these are guard redirects, not real
    // navigation. Pushing here means every re-render of a gated page adds a
    // fresh history entry, so pressing Back bounces straight back into the
    // same guard instead of leaving the vendor panel.
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (user?.role !== 'vendor' && !isAdminLevel) {
      navigate('/', { replace: true });
      return;
    }
    if (isAdminLevel && !vendorId) {
      navigate('/select-vendor', { replace: true });
    }
  }, [isAuthenticated, user, isAdminLevel, vendorId, navigate]);

  // Live notification bell (e.g. listing approval/rejection decisions).
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchUnreadCount();
      subscribe(user.id);
    }
    return () => unsubscribe();
  }, [isAuthenticated, user?.id]);

  if (!isAuthenticated || !user || (isAdminLevel && !vendorId)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const handleLogout = async () => {
    clearActingVendor();
    await logout();
    navigate('/');
  };

  const handleExitManagement = () => {
    clearActingVendor();
    navigate('/select-vendor');
  };

  const menuItems = [
    { path: '/vendor', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/vendor/hotels', icon: Building2, label: 'My Hotels' },
    { path: '/vendor/restaurant', icon: UtensilsCrossed, label: 'Restaurant POS' },
    { path: '/vendor/activities', icon: Compass, label: 'My Activities' },
    { path: '/vendor/tour-guides', icon: GuidesIcon, label: 'My Tour Guides' },
    { path: '/vendor/bookings', icon: Calendar, label: 'Bookings' },
    { path: '/vendor/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/vendor/profile', icon: UserCog, label: 'Business Profile' },
  ];

  return (
    <div className="min-h-screen bg-neutral-100 flex">
      <SEO title="Vendor Panel" noindex />
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-neutral-900 text-white flex-shrink-0 fixed h-screen overflow-y-auto z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <span className="font-display text-xl font-bold truncate">{displayName}</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-md hover:bg-neutral-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <nav className="mt-6">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center space-x-3 px-6 py-3 text-neutral-300 hover:bg-neutral-800 hover:text-white ${
                location.pathname === item.path ? 'bg-neutral-800 text-white border-l-2 border-accent-500' : ''
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 w-64 p-6 border-t border-neutral-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-accent-500 flex items-center justify-center">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-neutral-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-neutral-300 hover:text-white w-full"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-md hover:bg-neutral-100"
                >
                  <Menu className="h-6 w-6 text-neutral-600" />
                </button>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-neutral-900 truncate max-w-[50vw]">{displayName}</h1>
              </div>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="hidden sm:block">
                  <p className="text-sm text-neutral-500">Welcome, {user?.name}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Acting-as-vendor banner — only rendered when an admin-level user
            is managing someone else's panel, not for the vendor's own. */}
        {isAdminLevel && vendorId && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-amber-800">
              Managing <strong>{vendorName}</strong>'s panel as {user?.name}
            </p>
            <button
              onClick={handleExitManagement}
              className="flex items-center gap-1.5 text-sm font-medium text-amber-800 hover:text-amber-900"
            >
              <ExitIcon className="h-4 w-4" /> Exit
            </button>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default VendorLayout;
