import { create } from 'zustand';
import { adminAPI } from '../services/api';

const useSiteSettingsStore = create((set, get) => ({
  // Settings state
  settings: {},
  loading: false,
  error: null,
  initialized: false,

  // Fetch all settings
  fetchSettings: async () => {
    if (get().loading || get().initialized) return;
    
    set({ loading: true, error: null });
    try {
      const response = await adminAPI.getPublicSiteSettings();
      set({ 
        settings: response.data || {}, 
        loading: false, 
        initialized: true 
      });
    } catch (error) {
      console.error('Error fetching site settings:', error);
      set({ 
        error: error.message, 
        loading: false,
        initialized: true // Mark as initialized even on error to prevent infinite loops
      });
    }
  },

  // Get a specific setting value
  getSetting: (key, defaultValue = null) => {
    const { settings } = get();
    return settings[key] !== undefined ? settings[key] : defaultValue;
  },

  // Get site name — falls back to this deployment's actual brand (not the
  // generic template default) so the brief gap before the settings fetch
  // resolves never flashes the wrong name in the title/header.
  getSiteName: () => {
    return get().getSetting('site_name', 'Paradise Nepal');
  },

  // Get site tagline
  getSiteTagline: () => {
    return get().getSetting('site_tagline', 'Your gateway to luxury hotels and adventure activities in Nepal');
  },

  // Get logo URL
  getLogo: () => {
    return get().getSetting('site_logo', '/logo.png');
  },

  // Get primary color
  getPrimaryColor: () => {
    return get().getSetting('primary_color', '#4f46e5');
  },

  // Get header menu items
  getHeaderMenu: () => {
    return get().getSetting('header_menu', [
      { label: 'Hotels', url: '/hotels', icon: 'Building2' },
      { label: 'Activities', url: '/activities', icon: 'Compass' },
      { label: 'Tour Guides', url: '/tour-guides', icon: 'Users' },
      { label: 'Packages', url: '/itineraries', icon: 'Route' },
    ]);
  },

  // Get footer menu items
  getFooterMenu: () => {
    return get().getSetting('footer_menu', [
      { label: 'Hotels', url: '/hotels' },
      { label: 'Activities', url: '/activities' },
      { label: 'About Us', url: '/about' },
      { label: 'Contact', url: '/contact' },
    ]);
  },

  // Get contact info
  getContactInfo: () => {
    return {
      address: get().getSetting('contact_address', 'Thamel, Kathmandu, Nepal'),
      email: get().getSetting('contact_email', 'info@reservenow.com'),
      phone: get().getSetting('contact_phone', '+977 1 4412345'),
    };
  },

  // Get social media links
  getSocialLinks: () => {
    return {
      facebook: get().getSetting('social_facebook', ''),
      instagram: get().getSetting('social_instagram', ''),
      twitter: get().getSetting('social_twitter', ''),
      youtube: get().getSetting('social_youtube', ''),
    };
  },

  // Get footer description / blurb
  getFooterDescription: () => {
    return get().getSetting(
      'footer_description',
      'Handpicked hotels, activities, and local guides across Nepal — planned, booked, and supported by a team that knows the ground.'
    );
  },

  // Whether to show the footer newsletter signup bar
  isFooterNewsletterEnabled: () => {
    return get().getSetting('footer_newsletter_enabled', true);
  },

  // Footer newsletter headline
  getFooterNewsletterHeading: () => {
    return get().getSetting('footer_newsletter_heading', 'Deals, new stays, and adventure ideas — straight to your inbox.');
  },

  // Footer department-style directory grid
  getFooterDirectory: () => {
    return get().getSetting('footer_directory', [
      { label: 'Hotels & Stays', url: '/hotels' },
      { label: 'Activities', url: '/activities' },
      { label: 'Tour Guides', url: '/tour-guides' },
      { label: 'Holiday Packages', url: '/itineraries' },
      { label: 'Trip Planner', url: '/trip-planner' },
      { label: 'Get a Quote', url: '/quote' },
      { label: 'Become a Partner', url: '/register' },
      { label: 'Support', url: '/contact' },
    ]);
  },

  // Accepted payment method badges, as a plain list
  getFooterPaymentMethods: () => {
    const raw = get().getSetting('footer_payment_methods', 'Cash on Delivery, Khalti, Stripe');
    return String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  },

  // Footer bottom-bar copyright text (site name + year prepended by the caller)
  getFooterCopyrightText: () => {
    return get().getSetting('footer_copyright_text', 'All rights reserved.');
  },

  // Check if maintenance mode is enabled
  isMaintenanceMode: () => {
    return get().getSetting('maintenance_mode', false);
  },

  // Get analytics code
  getAnalyticsCode: () => {
    return get().getSetting('analytics_code', '');
  },

  // Reset store
  reset: () => {
    set({
      settings: {},
      loading: false,
      error: null,
      initialized: false,
    });
  },
}));

export default useSiteSettingsStore;
