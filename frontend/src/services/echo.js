import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Reverb speaks the Pusher protocol, so pusher-js is the client library —
// this mirrors Laravel's own documented Reverb + Echo setup.
window.Pusher = Pusher;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
// The API base already ends in `/api`; broadcasting auth lives alongside
// it at `/api/broadcasting/auth` (see routes/api.php — a custom
// auth:sanctum route, since this app uses Bearer tokens, not cookies, so
// Echo can't use Sanctum's default cookie-based broadcasting auth).
const AUTH_ENDPOINT = `${API_URL}/broadcasting/auth`;

let echoInstance = null;

/**
 * Lazily creates (or returns the existing) Echo/Reverb connection,
 * authenticated with the current Bearer token. Call disconnectEcho() on
 * logout so a stale connection/token doesn't linger.
 */
export const getEcho = () => {
  if (echoInstance) return echoInstance;

  const token = localStorage.getItem('token');
  if (!token) return null;

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
    wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT || 8080,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: AUTH_ENDPOINT,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  });

  return echoInstance;
};

export const disconnectEcho = () => {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
};
