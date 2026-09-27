import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Tracks which vendor an admin-level user is currently "managing" inside
 * the Management System (see SelectVendor.jsx / VendorLayout.jsx). Every
 * /vendor/* request carries this as an X-Acting-Vendor-Id header (see
 * services/api.js's request interceptor) so the backend's ActsForVendor
 * trait scopes to that vendor instead of the admin's own account.
 *
 * Persisted to sessionStorage (not localStorage) so it doesn't leak into
 * a new tab or survive long after the browser closes — "managing X's
 * panel" is meant to be a short, explicit, per-session action.
 */
const useActingVendorStore = create(
  persist(
    (set) => ({
      vendorId: null,
      vendorName: null,

      setActingVendor: (vendorId, vendorName) => set({ vendorId, vendorName }),
      clearActingVendor: () => set({ vendorId: null, vendorName: null }),
    }),
    {
      name: 'acting-vendor-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useActingVendorStore;
