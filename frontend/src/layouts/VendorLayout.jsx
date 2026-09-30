import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Building2, Compass, Calendar, LogOut, Menu, MessageSquare, X, Users as GuidesIcon, UserCog, LogOut as ExitIcon, UtensilsCrossed, ArrowLeftRight, ChevronRight } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import useNotificationStore from '../stores/notificationStore';
import useActingVendorStore from '../stores/actingVendorStore';
import NotificationBell from '../components/NotificationBell';
import SEO from '../components/SEO';

const ADMIN_LEVEL_ROLES = ['admin', 'manager', 'super_admin'];

const VendorLayout = () => {
  const { user, logout, isAuthenticated, hasAnyPermission } = useAuthStore();
  const { fetchUnreadCount, subscribe, unsubscribe } = useNotificationStore();
  const { vendorId, vendorName, clearActingVendor } = useActingVendorStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdminLevel = ADMIN_LEVEL_ROLES.includes(user?.role);
  // A Kitchen Staff login is a separate account (primary role stays
  // whatever it was, e.g. customer) that only holds the standalone
  // restaurant.kitchen.* permissions, scoped to one property via
  // RestaurantStaff — not a vendor and not admin-level, but still allowed
  // into this layout to reach their one Restaurant POS's Kitchen tab.
  const isKitchenStaff = hasAnyPermission(['restaurant.kitchen.view', 'restaurant.kitchen.manage']);
  // A Vendor also holds restaurant.kitchen.* (see RoleSeeder) so their own
  // full account isn't affected by this — it only strips the sidebar down
  // for an account that has NOTHING else (no vendor role, not admin-level).
  const isKitchenOnly = isKitchenStaff && user?.role !== 'vendor' && !isAdminLevel;

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
    if (user?.role !== 'vendor' && !isAdminLevel && !isKitchenStaff) {
      navigate('/', { replace: true });
      return;
    }
    if (isAdminLevel && !vendorId) {
      navigate('/select-vendor', { replace: true });
      return;
    }
    // Kitchen Staff has no use for the vendor Dashboard (bookings/revenue
    // stats they have no permission to see) — send them straight to the
    // Restaurant POS picker, which auto-forwards if they only have one.
    if (isKitchenOnly && location.pathname === '/vendor') {
      navigate('/vendor/restaurant', { replace: true });
    }
  }, [isAuthenticated, user, isAdminLevel, isKitchenStaff, isKitchenOnly, vendorId, location.pathname, navigate]);

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

  // Kitchen Staff can't use any of Hotels/Activities/Tour Guides/Bookings/
  // Profile (they own nothing) — the sidebar only offers what they can
  // actually act on, instead of a wall of links that all 403.
  const menuItems = isKitchenOnly
    ? [{ path: '/vendor/restaurant', icon: UtensilsCrossed, label: 'Restaurant POS' }]
    : [
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
      <aside className={`w-64 bg-neutral-900 text-white flex-shrink-0 fixed h-screen flex flex-col z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-5 border-b border-neutral-800/80 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-400">
                {isAdminLevel ? 'Management System' : isKitchenOnly ? 'Kitchen Access' : 'Vendor Portal'}
              </span>
              <p className="font-display text-lg font-bold truncate mt-0.5">{displayName}</p>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-neutral-800 shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {active && <ChevronRight className="h-4 w-4 ml-auto shrink-0" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-800/80 shrink-0 space-y-3">
          {isAdminLevel && (
            <button
              onClick={handleExitManagement}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-neutral-300 bg-neutral-800/60 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Switch vendor
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary-600 flex items-center justify-center font-semibold shrink-0">
              {user?.name?.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-neutral-400 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Acting-as-vendor banner — only rendered when an admin-level user
            is managing someone else's panel, not for the vendor's own. */}
        {isAdminLevel && vendorId && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between flex-wrap gap-2 text-sm">
            <p className="text-amber-800">
              Managing <strong>{vendorName}</strong>'s panel as {user?.name} — changes here affect their live listings.
            </p>
            <button
              onClick={handleExitManagement}
              className="flex items-center gap-1.5 font-medium text-amber-800 hover:text-amber-900 shrink-0"
            >
              <ExitIcon className="h-3.5 w-3.5" /> Exit
            </button>
          </div>
        )}

        {/* Header */}
        <header className="bg-white shadow-sm shrink-0">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-md hover:bg-neutral-100 shrink-0"
                >
                  <Menu className="h-6 w-6 text-neutral-600" />
                </button>
                <div className="min-w-0">
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-neutral-900 truncate">
                    {menuItems.find((m) => m.path === location.pathname)?.label || 'Dashboard'}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <NotificationBell />
                <div className="hidden sm:block text-right">
                  <p className="text-sm text-neutral-500">Welcome, {user?.name}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default VendorLayout;
