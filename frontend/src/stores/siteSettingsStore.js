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

  // Get site name
  getSiteName: () => {
    return get().getSetting('site_name', 'ReserveNow');
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
