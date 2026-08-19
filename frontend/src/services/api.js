import axios from 'axios';
import { normalizeApiError, isTransientApiError } from '../utils/apiError.js';
import { logClientError } from '../utils/clientLogger.js';

const createRequestId = () => {
  const randomId = crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `req_${randomId.replaceAll('-', '')}`;
};

// withCredentials is required for the httpOnly JWT cookie to be sent
// on every request; the backend never issues a bearer token.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000),
});

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers['X-Request-ID'] = config.headers['X-Request-ID'] || createRequestId();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = normalizeApiError(error);

    if (normalized.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('roomify:auth-expired', { detail: normalized }));
    }

    if (normalized.code !== 'CANCELED' && (normalized.status >= 500 || isTransientApiError(normalized))) {
      logClientError('api_request_failed', normalized, {
        method: error?.config?.method,
        url: error?.config?.url,
      });
    }

    return Promise.reject(normalized);
  }
);

export default api;
