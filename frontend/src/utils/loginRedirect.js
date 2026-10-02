// Send people back to the page they were on after logging in, instead of
// dropping them on the home page (e.g. a guest who clicked "Book Now").

export const loginUrl = (path = window.location.pathname + window.location.search) => {
  if (!path || path === '/' || path.startsWith('/login') || path.startsWith('/register')) return '/login';
  return `/login?redirect=${encodeURIComponent(path)}`;
};

// Only same-site paths — never "//evil.com" or "https://…" (open redirect).
export const safeRedirect = (value) => {
  if (!value || typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  if (value.startsWith('/login') || value.startsWith('/register')) return null;
  return value;
};
