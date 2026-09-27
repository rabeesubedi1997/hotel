// Two systems live behind one login: the Booking System (marketplace-wide
// admin — users, all bookings, site settings) and the Management System
// (one vendor's own operational panel — their hotels/activities/tour
// guides/bookings). Admin-level users have BOTH (they can also manage any
// vendor's Management System, via a vendor picker); a vendor only ever has
// their own Management System; a customer has neither.
const ADMIN_LEVEL_ROLES = ['admin', 'manager', 'super_admin'];

export const canAccessBookingSystem = (role) => ADMIN_LEVEL_ROLES.includes(role);

export const canAccessManagementSystem = (role) => role === 'vendor' || ADMIN_LEVEL_ROLES.includes(role);

/**
 * Where to send a user immediately after login (or when they click the
 * header's dashboard button) — skips the /select-system screen entirely
 * when they only qualify for one system.
 */
export const getSystemHomeRoute = (role) => {
  const booking = canAccessBookingSystem(role);
  const management = canAccessManagementSystem(role);

  if (booking && management) return '/select-system';
  if (booking) return '/admin';
  if (management) return role === 'vendor' ? '/vendor' : '/select-vendor';
  return '/';
};
