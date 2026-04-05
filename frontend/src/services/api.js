import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
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
  getBannerItems: () => api.get('/hotels/banner'),
};

// Activities APIs
export const activitiesAPI = {
  getAll: (params) => api.get('/activities', { params }),
  getFeatured: () => api.get('/activities/featured'),
  getBySlug: (slug) => api.get(`/activities/${slug}`),
  getTypes: () => api.get('/activities/types'),
  getCities: () => api.get('/activities/cities'),
  getBannerItems: () => api.get('/activities/banner'),
};

// Bookings APIs
export const bookingsAPI = {
  getAll: () => api.get('/bookings'),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  cancel: (id, reason) => api.post(`/bookings/${id}/cancel`, { cancellation_reason: reason }),
  checkAvailability: (data) => api.post('/bookings/check-availability', data),
};

// Payments APIs
export const paymentsAPI = {
  getMethods: () => api.get('/payments/methods'),
  createCOD: (data) => api.post('/payments/cod', data),
  initiateKhalti: (data) => api.post('/payments/khalti/initiate', data),
  verifyKhalti: (data) => api.post('/payments/khalti/verify', data),
  createStripeIntent: (data) => api.post('/payments/stripe/intent', data),
  paypalCreateOrder: (data) => api.post('/payments/paypal/create-order', data),
  confirm: (paymentId) => api.post(`/payments/${paymentId}/confirm`),
};

// Reviews APIs
export const reviewsAPI = {
  getAll: (params) => api.get('/reviews', { params }),
  create: (data) => api.post('/reviews', data),
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
};

// Wishlists APIs
export const wishlistsAPI = {
  getAll: () => api.get('/wishlists'),
  add: (data) => api.post('/wishlists', data),
  remove: (id) => api.delete(`/wishlists/${id}`),
  check: (params) => api.get('/wishlists/check', { params }),
};

// Admin APIs
export const adminAPI = {
  // Dashboard
  getStats: () => api.get('/admin/dashboard/stats'),
  getRecentBookings: () => api.get('/admin/dashboard/recent-bookings'),
  getPopularItems: () => api.get('/admin/dashboard/popular-items'),

  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  updateUserRole: (id, role) => api.post(`/admin/users/${id}/role`, { role }),
  updateUserStatus: (id, status) => api.post(`/admin/users/${id}/status`, { status }),

  // Hotels
  getHotels: (params) => api.get('/admin/hotels', { params }),
  createHotel: (data) => api.post('/admin/hotels', data),
  updateHotel: (id, data) => api.put(`/admin/hotels/${id}`, data),
  deleteHotel: (id) => api.delete(`/admin/hotels/${id}`),
  toggleHotelFeatured: (id) => api.post(`/admin/hotels/${id}/toggle-featured`),
  toggleHotelBanner: (id) => api.post(`/admin/hotels/${id}/toggle-banner`),
  updateHotelBannerOrder: (id, order) => api.post(`/admin/hotels/${id}/banner-order`, { banner_order: order }),
  getHotelBannerItems: () => api.get('/admin/hotels/banner-items'),

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
  updateBookingStatus: (id, status) => api.post(`/admin/bookings/${id}/status`, { status }),
  confirmBooking: (id) => api.post(`/admin/bookings/${id}/confirm`),
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
};

export default api;
