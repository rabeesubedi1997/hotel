import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './stores/authStore';
import useSiteSettingsStore from './stores/siteSettingsStore';
import { ToastProvider } from './contexts/ToastContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';

// Public Pages
import Home from './pages/Home';
import Hotels from './pages/Hotels';
import HotelDetails from './pages/HotelDetails';
import Activities from './pages/Activities';
import ActivityDetails from './pages/ActivityDetails';
import About from './pages/About';
import TourGuides from './pages/TourGuides';
import TourGuideDetail from './pages/TourGuideDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import GetQuote from './pages/GetQuote';
import ContactEnquiry from './pages/ContactEnquiry';

// Protected Pages
import Profile from './pages/Profile';
import Bookings from './pages/Bookings';
import BookingDetails from './pages/BookingDetails';
import Checkout from './pages/Checkout';
import Wishlist from './pages/Wishlist';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminHotels from './pages/admin/Hotels';
import AdminActivities from './pages/admin/Activities';
import AdminBookings from './pages/admin/Bookings';
import AdminUsers from './pages/admin/Users';
import AdminReviews from './pages/admin/Reviews';
import AdminBanner from './pages/admin/BannerManagement';
import AdminSEO from './pages/admin/SeoManagement';
import AdminSiteSettings from './pages/admin/SiteSettings';
import AdminAbout from './pages/admin/AboutManagement';
import AdminEnquiries from './pages/admin/EnquiriesManagement';
import AdminTourGuides from './pages/admin/TourGuideManagement';
import AdminMediaLibrary from './pages/admin/MediaLibrary';
import PagesManagement from './pages/admin/PagesManagement';

// Maintenance Mode Component
const MaintenanceMode = () => {
  const { getSiteName, getSiteLogo } = useSiteSettingsStore();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md mx-4">
        <div className="mb-6">
          <img 
            src={getSiteLogo()} 
            alt={getSiteName()} 
            className="h-16 mx-auto"
            onError={(e) => e.target.style.display = 'none'}
          />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Under Maintenance</h1>
        <p className="text-gray-600 mb-6">
          We're currently performing scheduled maintenance. We'll be back online shortly.
        </p>
        <div className="animate-pulse">
          <div className="h-2 bg-primary-600 rounded w-32 mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

// Maintenance Route Wrapper
const MaintenanceRoute = ({ children }) => {
  const { isMaintenanceMode, initialized, loading, fetchSettings } = useSiteSettingsStore();
  const { user } = useAuthStore();
  
  useEffect(() => {
    if (!initialized && !loading) {
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount
  
  // Show loading while settings are being fetched
  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  // Allow admin users to access site during maintenance
  if (isMaintenanceMode() && user?.role !== 'admin' && user?.role !== 'manager') {
    return <MaintenanceMode />;
  }
  
  return children;
};
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role !== 'admin' && user?.role !== 'manager') return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<MaintenanceRoute><MainLayout /></MaintenanceRoute>}>
            <Route index element={<Home />} />
            <Route path="hotels" element={<Hotels />} />
            <Route path="hotels/:slug" element={<HotelDetails />} />
            <Route path="activities" element={<Activities />} />
            <Route path="activities/:slug" element={<ActivityDetails />} />
            <Route path="about" element={<About />} />
            <Route path="tour-guides" element={<TourGuides />} />
            <Route path="tour-guides/:slug" element={<TourGuideDetail />} />
            <Route path="quote" element={<GetQuote />} />
            <Route path="contact" element={<ContactEnquiry />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />

            {/* Protected Routes */}
            <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
            <Route path="bookings/:id" element={<ProtectedRoute><BookingDetails /></ProtectedRoute>} />
            <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="hotels" element={<AdminHotels />} />
            <Route path="activities" element={<AdminActivities />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="banner" element={<AdminBanner />} />
            <Route path="seo" element={<AdminSEO />} />
            <Route path="settings" element={<AdminSiteSettings />} />
            <Route path="about" element={<AdminAbout />} />
            <Route path="media-library" element={<AdminMediaLibrary />} />
            <Route path="tour-guides" element={<AdminTourGuides />} />
            <Route path="enquiries" element={<AdminEnquiries />} />
            <Route path="pages" element={<PagesManagement />} />
          </Route>
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
