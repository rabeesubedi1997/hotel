import axios from 'axios';
import useActingVendorStore from '../stores/actingVendorStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add token to requests.
// Never overwrite an Authorization header a caller already set explicitly
// (e.g. a checkout flow pinning the session it created a booking under) —
// 'token' is a single shared localStorage key, so logging in/out in ANY
// other tab changes it for every open tab immediately. Without this guard,
// a booking created under one account could get paid for under whatever
// account happens to be logged in by the time the payment request fires.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // When an admin is managing a specific vendor's Management System panel,
  // every /vendor/* call needs to say which vendor — the backend's
  // ActsForVendor trait reads this and scopes accordingly (see
  // stores/actingVendorStore.js). Harmless to send on other requests too:
  // the backend only honors it for admin-level users hitting /vendor/*.
  const { vendorId } = useActingVendorStore.getState();
  if (vendorId && config.url?.includes('/vendor/')) {
    config.headers['X-Acting-Vendor-Id'] = vendorId;
  }

  return config;
});

// Handle token expiration.
// Must clear BOTH the plain 'token' key (read by the request interceptor
// above) AND zustand's persisted 'auth-storage' blob (authStore.js) — that
// blob carries its own independent copy of isAuthenticated/user/token and
// rehydrates on every load. Clearing only 'token' left isAuthenticated true
// after the hard redirect below, so the next mount re-fired the same
// authenticated request, 401'd again, and redirected in an infinite loop.
// Only redirect if we're not already there, so a 401 on the login page
// itself (e.g. a stray background request) can't loop either.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/login', credentials),
  register: (data) => api.post('/register', data),
  logout: () => api.post('/logout'),
  profile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile', data),
  changePassword: (data) => api.post('/change-password', data),
};

// Hotels APIs
export const hotelsAPI = {
  getAll: (params) => api.get('/hotels', { params }),
  getFeatured: () => api.get('/hotels/featured'),
  getBySlug: (slug) => api.get(`/hotels/${slug}`),
  getCities: () => api.get('/hotels/cities'),
  getDestinations: () => api.get('/hotels/destinations'),
  getFilters: () => api.get('/hotels/filters'),
  getBannerItems: () => api.get('/hotels/banner'),
};

// Activities APIs
export const activitiesAPI = {
  getAll: (params) => api.get('/activities', { params }),
  getFeatured: () => api.get('/activities/featured'),
  getBySlug: (slug) => api.get(`/activities/${slug}`),
  getTypes: () => api.get('/activities/types'),
  getCities: () => api.get('/activities/cities'),
  getDestinations: () => api.get('/activities/destinations'),
  getFilters: () => api.get('/activities/filters'),
  getBannerItems: () => api.get('/activities/banner'),
};

// Bookings APIs
export const bookingsAPI = {
  getAll: () => api.get('/bookings'),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data, config) => api.post('/bookings', data, config),
  delete: (id) => api.delete(`/bookings/${id}`),
  cancel: (id, reason) => api.post(`/bookings/${id}/cancel`, { cancellation_reason: reason }),
  checkAvailability: (data) => api.post('/bookings/check-availability', data),
  getCalendarData: (hotelId, roomId, year, month) => api.get('/bookings/calendar', {
    params: { hotel_id: hotelId, room_id: roomId, year, month }
  }),
  downloadInvoice: (id) => api.get(`/bookings/${id}/invoice`, { responseType: 'blob' }),
};

// Payments APIs
export const paymentsAPI = {
  // Enabled + configured gateways, as managed in Admin → Payment Gateways.
  getMethods: () => api.get('/payments/methods'),
  // Starts a payment with any gateway by its code. Offline gateways (cash)
  // complete immediately; others return { redirect_url } to send the customer to.
  initiate: (code, data, config) => api.post(`/payments/${code}/initiate`, data, config),
  // Called from /payment/return — the server asks the provider whether it really succeeded.
  verify: (paymentId) => api.post(`/payments/${paymentId}/verify`),
};

// Reviews APIs
export const reviewsAPI = {
  getAll: (params) => api.get('/reviews', { params }),
  create: (data) => {
    // If data is FormData (for file uploads), set correct headers
    if (data instanceof FormData) {
      return api.post('/reviews', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    return api.post('/reviews', data);
  },
  getMyReviews: () => api.get('/my-reviews'),
};

// Quotes & Enquiries APIs
export const quotesAPI = {
  getPackageOptions: () => api.get('/quotes/package-options'),
  create: (data) => api.post('/quotes', data),
  getMyQuotes: () => api.get('/my-quotes'),
};

export const enquiriesAPI = {
  create: (data) => api.post('/enquiries', data),
  getMyEnquiries: () => api.get('/my-enquiries'),
  
  // Tour Guide Bookings
  getMyTourGuideBookings: () => api.get('/my-tour-guide-bookings'),
  bookTourGuide: (slug, data) => api.post(`/tour-guides/${slug}/book`, data),
  cancelTourGuideBooking: (bookingId) => api.post(`/tour-guide-bookings/${bookingId}/cancel`),
};

// Coupons APIs
export const couponsAPI = {
  validate: (data) => api.post('/coupons/validate', data),
};

// Loyalty Points APIs
export const loyaltyAPI = {
  getAccount: () => api.get('/loyalty/account'),
  redeem: (data) => api.post('/loyalty/redeem', data),
};

// Wishlists APIs
export const wishlistsAPI = {
  getAll: () => api.get('/wishlists'),
  add: (data) => api.post('/wishlists', data),
  remove: (id) => api.delete(`/wishlists/${id}`),
  check: (params) => api.get('/wishlists/check', { params }),
};

// Chat APIs (authenticated — customer↔vendor inquiries, customer↔support; live delivery via Reverb, see services/echo.js)
// `guestToken` (optional, last arg) overrides the Authorization header for
// an anonymous visitor's floating-chat session — see FloatingChatWidget.jsx
// and chatStore.js. Never written to localStorage's shared 'token' key, so
// it can't be mistaken for a real logged-in session elsewhere in the app.
const authOverride = (guestToken) => (guestToken ? { headers: { Authorization: `Bearer ${guestToken}` } } : {});

export const chatAPI = {
  getConversations: (params) => api.get('/chat/conversations', { params }),
  startConversation: (data) => api.post('/chat/conversations', data),
  guestStart: (data) => api.post('/chat/guest-start', data),
  getConversation: (id, guestToken) => api.get(`/chat/conversations/${id}`, authOverride(guestToken)),
  sendMessage: (id, body, guestToken) => api.post(`/chat/conversations/${id}/messages`, { body }, authOverride(guestToken)),
  markRead: (id, guestToken) => api.post(`/chat/conversations/${id}/read`, {}, authOverride(guestToken)),
};

// Notifications APIs (authenticated — bell history; live push arrives via Reverb, see services/echo.js)
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
};

// Itineraries APIs (public — browse admin-curated packages)
export const itinerariesAPI = {
  getAll: (params) => api.get('/itineraries', { params }),
  getBySlug: (slug) => api.get(`/itineraries/${slug}`),
};

// Package Bookings APIs (fixed-price holiday packages, authenticated customer)
export const packageBookingsAPI = {
  getAll: () => api.get('/package-bookings'),
  getById: (id) => api.get(`/package-bookings/${id}`),
  create: (data, config) => api.post('/package-bookings', data, config),
  cancel: (id, reason) => api.post(`/package-bookings/${id}/cancel`, { cancellation_reason: reason }),
  downloadInvoice: (id) => api.get(`/package-bookings/${id}/invoice`, { responseType: 'blob' }),
};

// Trip Planner APIs (personal itineraries, authenticated customer)
export const tripPlansAPI = {
  getAll: () => api.get('/trip-plans'),
  create: (data) => api.post('/trip-plans', data),
  getById: (id) => api.get(`/trip-plans/${id}`),
  update: (id, data) => api.put(`/trip-plans/${id}`, data),
  delete: (id) => api.delete(`/trip-plans/${id}`),
  addItem: (id, data) => api.post(`/trip-plans/${id}/items`, data),
  updateItem: (id, itemId, data) => api.put(`/trip-plans/${id}/items/${itemId}`, data),
  removeItem: (id, itemId) => api.delete(`/trip-plans/${id}/items/${itemId}`),
};

// Admin APIs
export const adminAPI = {
  // Dashboard
  getStats: () => api.get('/admin/dashboard/stats'),
  getRecentBookings: () => api.get('/admin/dashboard/recent-bookings'),
  getPendingRequests: () => api.get('/admin/dashboard/pending-requests'),
  getPopularItems: () => api.get('/admin/dashboard/popular-items'),

  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  updateUserRole: (id, role) => api.post(`/admin/users/${id}/role`, { role }),
  updateUserStatus: (id, status) => api.post(`/admin/users/${id}/status`, { status }),
  resetUserPassword: (id) => api.post(`/admin/users/${id}/reset-password`),

  // Audit Log (superadmin/admin oversight trail)
  getAuditLog: (params) => api.get('/admin/audit-log', { params }),

  // Vendors Management
  getVendors: (params) => api.get('/admin/vendors', { params }),
  createVendor: (data) => api.post('/admin/vendors', data),
  getVendor: (id) => api.get(`/admin/vendors/${id}`),
  updateVendor: (id, data) => api.put(`/admin/vendors/${id}`, data),
  deleteVendor: (id) => api.delete(`/admin/vendors/${id}`),
  toggleVendorStatus: (id, data) => api.post(`/admin/vendors/${id}/toggle-status`, data),
  resetVendorPassword: (id) => api.post(`/admin/vendors/${id}/reset-password`),

  // Approvals Management
  getApprovalDashboard: () => api.get('/admin/approvals/dashboard'),
  getPendingHotels: () => api.get('/admin/approvals/pending-hotels'),
  getPendingActivities: () => api.get('/admin/approvals/pending-activities'),
  getPendingTourGuides: () => api.get('/admin/approvals/pending-tour-guides'),
  approveHotel: (id, data) => api.post(`/admin/approvals/hotels/${id}/approve`, data),
  approveActivity: (id, data) => api.post(`/admin/approvals/activities/${id}/approve`, data),
  approveTourGuideListing: (id, data) => api.post(`/admin/approvals/tour-guides/${id}/approve`, data),
  bulkApproveHotels: (data) => api.post('/admin/approvals/hotels/bulk-approve', data),
  bulkApproveActivities: (data) => api.post('/admin/approvals/activities/bulk-approve', data),
  bulkApproveTourGuideListings: (data) => api.post('/admin/approvals/tour-guides/bulk-approve', data),

  // Hotels
  getHotels: (params) => api.get('/admin/hotels', { params }),
  createHotel: (data) => api.post('/admin/hotels', data),
  updateHotel: (id, data) => api.put(`/admin/hotels/${id}`, data),
  deleteHotel: (id) => api.delete(`/admin/hotels/${id}`),
  toggleHotelFeatured: (id) => api.post(`/admin/hotels/${id}/toggle-featured`),
  toggleHotelBanner: (id) => api.post(`/admin/hotels/${id}/toggle-banner`),
  updateHotelBannerOrder: (id, order) => api.post(`/admin/hotels/${id}/banner-order`, { banner_order: order }),
  getHotelBannerItems: () => api.get('/admin/hotels/banner-items'),

  // Payment Gateways (admin / super_admin only)
  getPaymentGateways: () => api.get('/admin/payment-gateways'),
  createPaymentGateway: (data) => api.post('/admin/payment-gateways', data),
  updatePaymentGateway: (id, data) => api.put(`/admin/payment-gateways/${id}`, data),
  deletePaymentGateway: (id) => api.delete(`/admin/payment-gateways/${id}`),
  reorderPaymentGateways: (ids) => api.post('/admin/payment-gateways/reorder', { ids }),
  testPaymentGateway: (id) => api.post(`/admin/payment-gateways/${id}/test`),

  // Room Management — there's no separate /admin/hotels/{id}/rooms route;
  // Vendor\RoomController already lets an admin-level user manage any
  // hotel's rooms (see its isAdminLevel() bypass), so this reuses the
  // vendor endpoints rather than the public, GET-only /hotels/{id}/rooms.
  getHotelRooms: (hotelId) => api.get(`/vendor/hotels/${hotelId}/rooms`),
  createRoom: (hotelId, data) => api.post(`/vendor/hotels/${hotelId}/rooms`, data),
  updateRoom: (roomId, data) => api.put(`/vendor/rooms/${roomId}`, data),
  deleteRoom: (roomId) => api.delete(`/vendor/rooms/${roomId}`),

  // Activities
  getActivities: (params) => api.get('/admin/activities', { params }),
  createActivity: (data) => api.post('/admin/activities', data),
  updateActivity: (id, data) => api.put(`/admin/activities/${id}`, data),
  deleteActivity: (id) => api.delete(`/admin/activities/${id}`),
  toggleActivityFeatured: (id) => api.post(`/admin/activities/${id}/toggle-featured`),
  toggleActivityBanner: (id) => api.post(`/admin/activities/${id}/toggle-banner`),
  updateActivityBannerOrder: (id, order) => api.post(`/admin/activities/${id}/banner-order`, { banner_order: order }),
  getActivityBannerItems: () => api.get('/admin/activities/banner-items'),

  // Bookings
  getBookings: (params) => api.get('/admin/bookings', { params }),
  getBooking: (id) => api.get(`/admin/bookings/${id}`),
  updateBookingStatus: (id, status) => api.put(`/admin/bookings/${id}/status`, { status }),
  confirmBooking: (id) => api.post(`/admin/bookings/${id}/confirm`),
  deleteBooking: (id) => api.delete(`/admin/bookings/${id}`),
  processRefund: (id, data) => api.post(`/admin/bookings/${id}/refund`, data),

  // Reviews
  getReviews: (params) => api.get('/admin/reviews', { params }),
  approveReview: (id) => api.post(`/admin/reviews/${id}/approve`),
  rejectReview: (id) => api.post(`/admin/reviews/${id}/reject`),
  deleteReview: (id) => api.delete(`/admin/reviews/${id}`),

  // Site Settings (Public)
  getPublicSiteSettings: () => api.get('/settings/public'),
  getPublicSiteSettingsByGroup: (group) => api.get(`/settings/public/${group}`),
  getSiteSettings: () => api.get('/admin/settings'),
  getSiteSettingsGroups: () => api.get('/admin/settings/groups'),
  initializeSiteSettings: () => api.get('/admin/settings/initialize'),
  getSiteSettingsByGroup: (group) => api.get(`/admin/settings/group/${group}`),
  getAllSiteSettings: () => api.get('/admin/settings/all'),
  getSiteSetting: (key) => api.get(`/admin/settings/${key}`),
  createSiteSetting: (data) => api.post('/admin/settings', data),
  updateSiteSetting: (key, data) => api.put(`/admin/settings/${key}`, data),
  bulkUpdateSiteSettings: (settings) => api.put('/admin/settings/bulk', { settings }),
  deleteSiteSetting: (key) => api.delete(`/admin/settings/${key}`),
  uploadImage: (formData) => api.post('/admin/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),

  // SEO Settings
  getSeoSettings: () => api.get('/admin/seo'),
  getSeoSetting: (page) => api.get(`/admin/seo/${page}`),
  createSeoSetting: (data) => api.post('/admin/seo', data),
  updateSeoSetting: (page, data) => api.put(`/admin/seo/${page}`, data),
  deleteSeoSetting: (page) => api.delete(`/admin/seo/${page}`),

  // About Page
  getAboutPage: () => api.get('/admin/about'),
  updateAboutPage: (data) => api.post('/admin/about', data),
  uploadAboutImage: (formData) => api.post('/admin/about/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),

  // Enquiries
  getEnquiries: (params) => api.get('/admin/enquiries', { params }),
  getEnquiry: (id) => api.get(`/admin/enquiries/${id}`),
  respondToEnquiry: (id, response) => api.post(`/admin/enquiries/${id}/respond`, { response }),
  updateEnquiryStatus: (id, status) => api.post(`/admin/enquiries/${id}/status`, { status }),
  deleteEnquiry: (id) => api.delete(`/admin/enquiries/${id}`),

  // Media Library
  getMediaLibrary: (params) => api.get('/admin/media-library', { params }),
  uploadToMediaLibrary: (formData) => api.post('/admin/media-library/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteFromMediaLibrary: (path) => api.delete('/admin/media-library', { data: { path } }),

  // Tour Guides
  getTourGuides: (params) => api.get('/admin/tour-guides', { params }),
  getTourGuide: (id) => api.get(`/admin/tour-guides/${id}`),
  createTourGuide: (data) => api.post('/admin/tour-guides', data),
  updateTourGuide: (id, data) => api.put(`/admin/tour-guides/${id}`, data),
  deleteTourGuide: (id) => api.delete(`/admin/tour-guides/${id}`),
  uploadTourGuideImage: (formData) => api.post('/admin/tour-guides/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getTourGuideBookings: () => api.get('/admin/tour-guide-bookings'),
  updateTourGuideBookingStatus: (bookingId, status, notes) => api.post(`/admin/tour-guide-bookings/${bookingId}/status`, { status, admin_notes: notes }),
  seedDefaultTourGuides: () => api.post('/admin/tour-guides/seed-defaults'),

  // Pages Management
  getPages: () => api.get('/admin/pages'),
  getPage: (id) => api.get(`/admin/pages/${id}`),
  createPage: (data) => api.post('/admin/pages', data),
  updatePage: (id, data) => api.put(`/admin/pages/${id}`, data),
  deletePage: (id) => api.delete(`/admin/pages/${id}`),

  // Itineraries Management (curated packages)
  getItineraries: (params) => api.get('/admin/itineraries', { params }),
  createItinerary: (data) => api.post('/admin/itineraries', data),
  getItinerary: (id) => api.get(`/admin/itineraries/${id}`),
  updateItinerary: (id, data) => api.put(`/admin/itineraries/${id}`, data),
  deleteItinerary: (id) => api.delete(`/admin/itineraries/${id}`),
  addItineraryItem: (id, data) => api.post(`/admin/itineraries/${id}/items`, data),
  updateItineraryItem: (id, itemId, data) => api.put(`/admin/itineraries/${id}/items/${itemId}`, data),
  removeItineraryItem: (id, itemId) => api.delete(`/admin/itineraries/${id}/items/${itemId}`),

  // Promotions (advertising / promotional banners)
  getPromotions: (params) => api.get('/admin/promotions', { params }),
  getPromotion: (id) => api.get(`/admin/promotions/${id}`),
  createPromotion: (data) => api.post('/admin/promotions', data),
  updatePromotion: (id, data) => api.put(`/admin/promotions/${id}`, data),
  deletePromotion: (id) => api.delete(`/admin/promotions/${id}`),
  togglePromotionActive: (id) => api.post(`/admin/promotions/${id}/toggle-active`),

  // Loyalty points
  getLoyaltyAccounts: (params) => api.get('/admin/loyalty/accounts', { params }),
  adjustLoyaltyPoints: (userId, data) => api.post(`/admin/loyalty/accounts/${userId}/adjust`, data),
  getLoyaltyTransactions: (params) => api.get('/admin/loyalty/transactions', { params }),

  // Exchange Rates (multi-currency display)
  getExchangeRates: () => api.get('/admin/exchange-rates'),
  updateExchangeRate: (data) => api.post('/admin/exchange-rates', data),
  deleteExchangeRate: (id) => api.delete(`/admin/exchange-rates/${id}`),

  // Package Bookings (fixed-price holiday packages)
  getPackageBookings: (params) => api.get('/admin/package-bookings', { params }),
  getPackageBooking: (id) => api.get(`/admin/package-bookings/${id}`),
  updatePackageBookingStatus: (id, status) => api.post(`/admin/package-bookings/${id}/status`, { status }),
  processPackageBookingRefund: (id, data) => api.post(`/admin/package-bookings/${id}/refund`, data),

  // Coupons (promo/discount codes)
  getCoupons: (params) => api.get('/admin/coupons', { params }),
  getCoupon: (id) => api.get(`/admin/coupons/${id}`),
  createCoupon: (data) => api.post('/admin/coupons', data),
  updateCoupon: (id, data) => api.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),
  toggleCouponActive: (id) => api.post(`/admin/coupons/${id}/toggle-active`),
  getCouponRedemptions: (id) => api.get(`/admin/coupons/${id}/redemptions`),
};

// Restaurant POS URLs are owned by either a hotel or an activity —
// 'hotel' -> /vendor/hotels/..., 'activity' -> /vendor/activities/...
const ownerPath = (ownerType) => (ownerType === 'activity' ? 'activities' : 'hotels');

// Vendor APIs
export const vendorAPI = {
  // Dashboard
  getStats: () => api.get('/vendor/dashboard/stats'),
  
  // Hotels Management
  getHotels: (params) => api.get('/vendor/hotels', { params }),
  getHotel: (id) => api.get(`/vendor/hotels/${id}`),
  createHotel: (data) => api.post('/vendor/hotels', data),
  updateHotel: (id, data) => api.put(`/vendor/hotels/${id}`, data),
  deleteHotel: (id) => api.delete(`/vendor/hotels/${id}`),
  
  // Room Management
  getHotelRooms: (hotelId) => api.get(`/vendor/hotels/${hotelId}/rooms`),
  createRoom: (hotelId, data) => api.post(`/vendor/hotels/${hotelId}/rooms`, data),
  updateRoom: (roomId, data) => api.put(`/vendor/rooms/${roomId}`, data),
  deleteRoom: (roomId) => api.delete(`/vendor/rooms/${roomId}`),
  
  // Activities Management
  getActivities: (params) => api.get('/vendor/activities', { params }),
  createActivity: (data) => api.post('/vendor/activities', data),
  updateActivity: (id, data) => api.put(`/vendor/activities/${id}`, data),
  deleteActivity: (id) => api.delete(`/vendor/activities/${id}`),

  // Tour Guide Services Management
  getTourGuides: (params) => api.get('/vendor/tour-guides', { params }),
  createTourGuide: (data) => api.post('/vendor/tour-guides', data),
  updateTourGuide: (id, data) => api.put(`/vendor/tour-guides/${id}`, data),
  deleteTourGuide: (id) => api.delete(`/vendor/tour-guides/${id}`),

  // Business Profile
  getProfile: () => api.get('/vendor/profile'),
  updateProfile: (data) => api.put('/vendor/profile', data),

  // Restaurant POS is owned by either a hotel or an activity — same
  // endpoints, different URL prefix. ownerType is 'hotel' | 'activity'.
  getActivity: (id) => api.get(`/vendor/activities/${id}`),

  // Restaurant POS: Menu
  getMenuItems: (ownerType, ownerId) => api.get(`/vendor/${ownerPath(ownerType)}/${ownerId}/menu-items`),
  createMenuItem: (ownerType, ownerId, data) => api.post(`/vendor/${ownerPath(ownerType)}/${ownerId}/menu-items`, data),
  updateMenuItem: (itemId, data) => api.put(`/vendor/menu-items/${itemId}`, data),
  deleteMenuItem: (itemId) => api.delete(`/vendor/menu-items/${itemId}`),
  bulkUpdateMenuAvailability: (ownerType, ownerId, data) => api.post(`/vendor/${ownerPath(ownerType)}/${ownerId}/menu-items/bulk-availability`, data),
  importMenuItems: (ownerType, ownerId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/vendor/${ownerPath(ownerType)}/${ownerId}/menu-items/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Restaurant POS: Menu Categories
  getMenuCategories: (ownerType, ownerId) => api.get(`/vendor/${ownerPath(ownerType)}/${ownerId}/menu-categories`),
  createMenuCategory: (ownerType, ownerId, data) => api.post(`/vendor/${ownerPath(ownerType)}/${ownerId}/menu-categories`, data),
  updateMenuCategory: (categoryId, data) => api.put(`/vendor/menu-categories/${categoryId}`, data),
  deleteMenuCategory: (categoryId) => api.delete(`/vendor/menu-categories/${categoryId}`),
  reorderMenuCategories: (ownerType, ownerId, ids) => api.post(`/vendor/${ownerPath(ownerType)}/${ownerId}/menu-categories/reorder`, { ids }),

  // Restaurant POS: Inventory Settings
  updateInventorySettings: (ownerType, ownerId, data) => api.put(`/vendor/${ownerPath(ownerType)}/${ownerId}/inventory-settings`, data),

  // Restaurant POS: Tables
  getTables: (ownerType, ownerId) => api.get(`/vendor/${ownerPath(ownerType)}/${ownerId}/tables`),
  createTable: (ownerType, ownerId, data) => api.post(`/vendor/${ownerPath(ownerType)}/${ownerId}/tables`, data),
  updateTable: (tableId, data) => api.put(`/vendor/tables/${tableId}`, data),
  deleteTable: (tableId) => api.delete(`/vendor/tables/${tableId}`),

  // Restaurant POS: Orders / Kitchen
  getOrders: (ownerType, ownerId, params) => api.get(`/vendor/${ownerPath(ownerType)}/${ownerId}/orders`, { params }),
  createOrder: (ownerType, ownerId, data) => api.post(`/vendor/${ownerPath(ownerType)}/${ownerId}/orders`, data),
  updateOrderStatus: (orderId, status) => api.put(`/vendor/orders/${orderId}/status`, { status }),
  updateOrderRush: (orderId, isRush) => api.put(`/vendor/orders/${orderId}/rush`, { is_rush: isRush }),
  updateOrderItemStatus: (orderId, itemId, status) => api.put(`/vendor/orders/${orderId}/items/${itemId}/status`, { status }),
  transferOrderTable: (orderId, tableId) => api.put(`/vendor/orders/${orderId}/transfer-table`, { table_id: tableId }),
  mergeOrder: (orderId, targetOrderId) => api.post(`/vendor/orders/${orderId}/merge`, { target_order_id: targetOrderId }),
  getEarningsReport: (ownerType, ownerId, params) => api.get(`/vendor/${ownerPath(ownerType)}/${ownerId}/reports/earnings`, { params }),

  // Restaurant POS: "Charge to Room" — active booking lookup
  getActiveBookings: (ownerType, ownerId, params) => api.get(`/vendor/${ownerPath(ownerType)}/${ownerId}/active-bookings`, { params }),

  // Restaurant POS: Staff access (Kitchen or Waiter)
  getMyRestaurantAccess: () => api.get('/vendor/my-restaurant-access'),
  getRestaurantStaff: (ownerType, ownerId) => api.get(`/vendor/${ownerPath(ownerType)}/${ownerId}/staff`),
  addRestaurantStaff: (ownerType, ownerId, data) => api.post(`/vendor/${ownerPath(ownerType)}/${ownerId}/staff`, data),
  removeRestaurantStaff: (staffId) => api.delete(`/vendor/restaurant-staff/${staffId}`),

  // Bookings Management
  getBookings: (params) => api.get('/vendor/bookings', { params }),
  getBooking: (id) => api.get(`/vendor/bookings/${id}`),
  updateBookingStatus: (id, data) => api.put(`/vendor/bookings/${id}/status`, data),
  getBookingStats: () => api.get('/vendor/bookings/stats'),
  voidBookingCharge: (chargeId) => api.put(`/vendor/booking-charges/${chargeId}/void`),

  // Media Library
  getMediaLibrary: (params) => api.get('/vendor/media-library', { params }),
  uploadToMediaLibrary: (formData) => api.post('/vendor/media-library/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteMedia: (path) => api.delete(`/vendor/media-library`, { data: { path } }),
};

// Public APIs (no auth required)
export const publicAPI = {
  getAboutPage: () => api.get('/about'),
  getTourGuides: () => api.get('/tour-guides'),
  getTourGuide: (slug) => api.get(`/tour-guides/${slug}`),
  getPage: (slug) => api.get(`/pages/${slug}`),
  getVendorProfile: (slug) => api.get(`/vendors/${slug}`),
  getPromotions: (placement) => api.get('/promotions', { params: { placement } }),
  trackPromotionClick: (id) => api.post(`/promotions/${id}/click`),
};

export default api;
