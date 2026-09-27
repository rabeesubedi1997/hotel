import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login(credentials);
          const { user, token, permissions } = response.data;
          
          // Merge permissions into user object
          const userWithPermissions = {
            ...user,
            permissions: permissions || []
          };
          
          localStorage.setItem('token', token);
          set({ user: userWithPermissions, token, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (error) {
          set({
            error: error.response?.data?.message || 'Login failed',
            isLoading: false,
          });
          return { success: false, error: error.response?.data?.message };
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.register(data);
          const { user, token, permissions } = response.data;
          
          // Merge permissions into user object
          const userWithPermissions = {
            ...user,
            permissions: permissions || []
          };
          
          localStorage.setItem('token', token);
          set({ user: userWithPermissions, token, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (error) {
          set({
            error: error.response?.data?.message || 'Registration failed',
            isLoading: false,
          });
          return { success: false, error: error.response?.data?.message };
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          console.error('Logout error:', error);
        }
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false, error: null });
      },

      fetchProfile: async () => {
        try {
          const response = await authAPI.profile();
          const { user, permissions } = response.data;
          
          // Merge permissions into user object
          const userWithPermissions = {
            ...user,
            permissions: permissions || []
          };
          
          set({ user: userWithPermissions });
        } catch (error) {
          if (error.response?.status === 401) {
            get().logout();
          }
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.updateProfile(data);
          set({ user: response.data.user, isLoading: false });
          return { success: true };
        } catch (error) {
          set({
            error: error.response?.data?.message || 'Update failed',
            isLoading: false,
          });
          return { success: false, error: error.response?.data?.message };
        }
      },

      isAdmin: () => get().user?.role === 'admin',
      isManager: () => get().user?.role === 'manager',
      isVendor: () => get().user?.role === 'vendor',
      isCustomer: () => get().user?.role === 'customer',
      isSuperAdmin: () => get().user?.role === 'super_admin',

      // Permission checking methods
      hasPermission: (permission) => {
        const user = get().user;
        if (!user) return false;
        
        // If no permissions array, try to fetch them
        if (!user.permissions || user.permissions.length === 0) {
          // For now, use role-based fallback
          if (user.role === 'admin' || user.role === 'super_admin') {
            return true; // Admins have all permissions
          }
          if (user.role === 'manager') {
            return ['hotels.view.all', 'activities.view.all', 'bookings.view.all'].includes(permission);
          }
          if (user.role === 'vendor') {
            return permission.includes('.own') || permission === 'media.upload';
          }
          if (user.role === 'customer') {
            return ['bookings.view.own', 'bookings.create', 'reviews.create', 'wishlist.create'].includes(permission);
          }
          return false;
        }
        
        return user.permissions.includes(permission);
      },

      hasAnyPermission: (permissions) => {
        const user = get().user;
        if (!user || !user.permissions) return false;
        return permissions.some(permission => user.permissions.includes(permission));
      },

      hasAllPermissions: (permissions) => {
        const user = get().user;
        if (!user || !user.permissions) return false;
        return permissions.every(permission => user.permissions.includes(permission));
      },

      canAccess: (feature, scope = 'own') => {
        const user = get().user;
        if (!user || !user.permissions) return false;
        
        const permission = `${feature}.${scope}`;
        
        // Check specific permission first
        if (user.permissions.includes(permission)) {
          return true;
        }
        
        // Check broader permissions
        if (user.permissions.includes(`${feature}.all`)) {
          return true;
        }
        
        // Check assigned permissions for managers
        if (user.permissions.includes(`${feature}.assigned`)) {
          return true;
        }
        
        return false;
      },

      // Role hierarchy checking
      isAdminLevel: () => {
        const user = get().user;
        return user && ['admin', 'manager', 'super_admin'].includes(user.role);
      },

      canAccessAdminDashboard: () => {
        const user = get().user;
        if (!user) return false;
        
        // Check explicit permission
        if (user.permissions && user.permissions.includes('admin.dashboard.access')) {
          return true;
        }
        
        // Check role hierarchy
        return ['admin', 'manager', 'super_admin'].includes(user.role);
      },

      // Feature-specific access methods
      canManageHotels: (scope = 'own') => get().canAccess('hotels', scope),
      canManageActivities: (scope = 'own') => get().canAccess('activities', scope),
      canManageBookings: (scope = 'own') => get().canAccess('bookings', scope),
      canManageUsers: (scope = 'own') => get().canAccess('users', scope),
      canManageMedia: (scope = 'own') => get().canAccess('media', scope),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;
