import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Building2, Compass, Calendar, Users, Star, LogOut, Menu, Image, Globe, Settings, Mail, MapPin, Images, Layout, Map, ScrollText, MessageSquare, Megaphone, Tag, DollarSign, Award, X } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import useNotificationStore from '../stores/notificationStore';
import NotificationBell from '../components/NotificationBell';

const AdminLayout = () => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const { fetchUnreadCount, subscribe, unsubscribe } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Redirect to login if not authenticated or not admin/manager/super_admin/vendor
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'admin' && user?.role !== 'manager' && user?.role !== 'super_admin' && user?.role !== 'vendor') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  // Live notification bell (e.g. approval decisions, booking updates).
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchUnreadCount();
      subscribe(user.id);
    }
    return () => unsubscribe();
  }, [isAuthenticated, user?.id]);

  // Show nothing while checking auth to prevent flash
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/hotels', icon: Building2, label: 'Hotels', vendorOnly: true },
    { path: '/admin/activities', icon: Compass, label: 'Activities', vendorOnly: true },
    { path: '/admin/bookings', icon: Calendar, label: 'Bookings', vendorOnly: true },
    { path: '/admin/package-bookings', icon: Map, label: 'Package Bookings', adminOnly: true },
    { path: '/admin/users', icon: Users, label: 'Users', adminOnly: true },
    { path: '/admin/vendors', icon: Users, label: 'Vendors', adminOnly: true },
    { path: '/admin/reviews', icon: Star, label: 'Reviews', adminOnly: true },
    { path: '/admin/banner', icon: Image, label: 'Banner', adminOnly: true },
    { path: '/admin/promotions', icon: Megaphone, label: 'Promotions', adminOnly: true },
    { path: '/admin/coupons', icon: Tag, label: 'Coupons', adminOnly: true },
    { path: '/admin/exchange-rates', icon: DollarSign, label: 'Currencies', adminOnly: true },
    { path: '/admin/loyalty', icon: Award, label: 'Loyalty Points', adminOnly: true },
    { path: '/admin/seo', icon: Globe, label: 'SEO', adminOnly: true },
    { path: '/admin/settings', icon: Settings, label: 'Site Settings', adminOnly: true },
    { path: '/admin/tour-guides', icon: MapPin, label: 'Tour Guides', adminOnly: true },
    { path: '/admin/itineraries', icon: Map, label: 'Itineraries', adminOnly: true },
    { path: '/admin/media-library', icon: Images, label: 'Media Library', adminOnly: true },
    { path: '/admin/enquiries', icon: Mail, label: 'Enquiries', adminOnly: true },
    { path: '/admin/pages', icon: Layout, label: 'Pages', adminOnly: true },
    { path: '/admin/audit-log', icon: ScrollText, label: 'Audit Log', adminOnly: true },
    { path: '/admin/messages', icon: MessageSquare, label: 'Messages', adminOnly: true },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (user?.role === 'vendor') {
      return !item.adminOnly; // Hide admin-only items from vendors
    }
    return true; // Admins and managers see everything
  });

  return (
    <div className="min-h-screen bg-neutral-100 flex">
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
        <div className="p-6 shrink-0">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <span className="font-display text-xl font-bold">ReserveNow Admin</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-md hover:bg-neutral-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <nav className="mt-8 flex-1 overflow-y-auto">
          <div className="space-y-1">
            {filteredMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`${
                  location.pathname === item.path
                    ? 'bg-primary-500/10 border-primary-500 text-primary-300'
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                } group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon
                  className={`${
                    location.pathname === item.path
                      ? 'text-primary-400'
                      : 'text-neutral-400 group-hover:text-neutral-200'
                  } mr-3 h-5 w-5`}
                />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="shrink-0 w-64 p-6 border-t border-neutral-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-neutral-400">{user?.role}</p>
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
                <h1 className="font-display text-xl sm:text-2xl font-bold text-neutral-900">Admin Panel</h1>
              </div>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="hidden sm:block">
                  <p className="text-sm text-neutral-500">Welcome back, {user?.name}</p>
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

export default AdminLayout;
