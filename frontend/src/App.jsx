import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import Itineraries from './pages/Itineraries';
import ItineraryDetails from './pages/ItineraryDetails';
import VendorProfile from './pages/VendorProfile';
import Messages from './pages/Messages';
import Loyalty from './pages/Loyalty';

// Protected Pages
import Profile from './pages/Profile';
import Bookings from './pages/Bookings';
import BookingDetails from './pages/BookingDetails';
import Checkout from './pages/Checkout';
import PackageBookingDetails from './pages/PackageBookingDetails';
import Wishlist from './pages/Wishlist';
import TripPlanner from './pages/TripPlanner';
import TripPlannerDetail from './pages/TripPlannerDetail';

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
import AdminVendors from './pages/admin/VendorsManagement';
import PagesManagement from './pages/admin/PagesManagement';
import AdminItineraries from './pages/admin/Itineraries';
import AdminAuditLog from './pages/admin/AuditLog';
import AdminMessages from './pages/admin/Messages';
import AdminPromotions from './pages/admin/PromotionsManagement';
import AdminCoupons from './pages/admin/Coupons';
import AdminPackageBookings from './pages/admin/PackageBookings';
import AdminExchangeRates from './pages/admin/ExchangeRates';
import AdminLoyalty from './pages/admin/Loyalty';

// Vendor Pages
import VendorLayout from './layouts/VendorLayout';
import VendorDashboard from './pages/vendor/Dashboard';
import VendorHotels from './pages/vendor/Hotels';
import VendorActivities from './pages/vendor/Activities';
import VendorTourGuides from './pages/vendor/TourGuides';
import VendorBusinessProfile from './pages/vendor/BusinessProfile';
import VendorBookings from './pages/vendor/Bookings';
import VendorMessages from './pages/vendor/Messages';
import SelectSystem from './pages/SelectSystem';
import SelectVendor from './pages/SelectVendor';
import AdminApprovals from './pages/admin/Approvals';

// React Router doesn't reset scroll position on navigation the way a full
// page load does — without this, clicking a link while scrolled halfway
// down a page leaves the next page open at that same scroll offset.
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Maintenance Mode Component
const MaintenanceMode = () => {
  const { getSiteName, getLogo } = useSiteSettingsStore();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md mx-4">
        <div className="mb-6">
          <img
            src={getLogo()}
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
  if (isMaintenanceMode() && user?.role !== 'admin' && user?.role !== 'manager' && user?.role !== 'super_admin') {
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
  
  // Allow admin, manager, super_admin, and vendor roles
  if (user?.role !== 'admin' && user?.role !== 'manager' && user?.role !== 'super_admin' && user?.role !== 'vendor') {
    return <Navigate to="/" />;
  }
  
  return children;
};

// Vendor Route Component
const VendorRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" />;
  // Admin-level users can also enter the Management System (managing a
  // vendor's panel on their behalf — see SelectVendor.jsx); VendorLayout
  // itself then redirects them to /select-vendor if they haven't picked
  // a vendor yet.
  if (user?.role !== 'vendor' && !['admin', 'manager', 'super_admin'].includes(user?.role)) {
    return <Navigate to="/" />;
  }
  return children;
};

function App() {
  return (
    <ToastProvider>
      <Router>
        <ScrollToTop />
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
            <Route path="itineraries" element={<Itineraries />} />
            <Route path="itineraries/:slug" element={<ItineraryDetails />} />
            <Route path="vendors/:slug" element={<VendorProfile />} />

            {/* Protected Routes */}
            <Route path="select-system" element={<ProtectedRoute><SelectSystem /></ProtectedRoute>} />
            <Route path="select-vendor" element={<ProtectedRoute><SelectVendor /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
            <Route path="bookings/:id" element={<ProtectedRoute><BookingDetails /></ProtectedRoute>} />
            <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="package-bookings/:id" element={<ProtectedRoute><PackageBookingDetails /></ProtectedRoute>} />
            <Route path="wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
            <Route path="trip-planner" element={<ProtectedRoute><TripPlanner /></ProtectedRoute>} />
            <Route path="trip-planner/:id" element={<ProtectedRoute><TripPlannerDetail /></ProtectedRoute>} />
            <Route path="loyalty" element={<ProtectedRoute><Loyalty /></ProtectedRoute>} />
            <Route path="messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="messages/:id" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="hotels" element={<AdminHotels />} />
            <Route path="activities" element={<AdminActivities />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="approvals" element={<AdminApprovals />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="banner" element={<AdminBanner />} />
            <Route path="seo" element={<AdminSEO />} />
            <Route path="settings" element={<AdminSiteSettings />} />
            <Route path="about" element={<AdminAbout />} />
            <Route path="media-library" element={<AdminMediaLibrary />} />
            <Route path="tour-guides" element={<AdminTourGuides />} />
            <Route path="itineraries" element={<AdminItineraries />} />
            <Route path="audit-log" element={<AdminAuditLog />} />
            <Route path="promotions" element={<AdminPromotions />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="package-bookings" element={<AdminPackageBookings />} />
            <Route path="exchange-rates" element={<AdminExchangeRates />} />
            <Route path="loyalty" element={<AdminLoyalty />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="messages/:id" element={<AdminMessages />} />
            <Route path="enquiries" element={<AdminEnquiries />} />
            <Route path="pages" element={<PagesManagement />} />
          </Route>

          {/* Vendor Routes */}
          <Route path="/vendor" element={<VendorRoute><VendorLayout /></VendorRoute>}>
            <Route index element={<VendorDashboard />} />
            <Route path="hotels" element={<VendorHotels />} />
            <Route path="activities" element={<VendorActivities />} />
            <Route path="tour-guides" element={<VendorTourGuides />} />
            <Route path="profile" element={<VendorBusinessProfile />} />
            <Route path="bookings" element={<VendorBookings />} />
            <Route path="messages" element={<VendorMessages />} />
            <Route path="messages/:id" element={<VendorMessages />} />
          </Route>
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
