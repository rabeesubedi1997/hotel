import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Building2, Compass, Calendar, Users, Star, LogOut, Menu, Image, Globe, Settings, Mail, MapPin, Images, Layout, X } from 'lucide-react';
import useAuthStore from '../stores/authStore';

const AdminLayout = () => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'admin' && user?.role !== 'manager') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

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
    { path: '/admin/hotels', icon: Building2, label: 'Hotels' },
    { path: '/admin/activities', icon: Compass, label: 'Activities' },
    { path: '/admin/bookings', icon: Calendar, label: 'Bookings' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/reviews', icon: Star, label: 'Reviews' },
    { path: '/admin/banner', icon: Image, label: 'Banner' },
    { path: '/admin/seo', icon: Globe, label: 'SEO' },
    { path: '/admin/settings', icon: Settings, label: 'Site Settings' },
    { path: '/admin/tour-guides', icon: MapPin, label: 'Tour Guides' },
    { path: '/admin/media-library', icon: Images, label: 'Media Library' },
    { path: '/admin/enquiries', icon: Mail, label: 'Enquiries' },
    { path: '/admin/pages', icon: Layout, label: 'Pages' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`w-64 bg-gray-800 text-white flex-shrink-0 fixed h-screen overflow-y-auto z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold">ReserveNow Admin</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-700"
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
              className={`flex items-center space-x-3 px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white ${
                location.pathname === item.path ? 'bg-gray-700 text-white' : ''
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 w-64 p-6 border-t border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-gray-300 hover:text-white w-full"
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
                  className="lg:hidden p-2 rounded-md hover:bg-gray-100"
                >
                  <Menu className="h-6 w-6 text-gray-600" />
                </button>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Panel</h1>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm text-gray-500">Welcome back, {user?.name}</p>
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
