import axios from 'axios';

/* ── Base URL ────────────────────────────────────────────────── */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/* ═══════════════════════════════════════════════════════════════
   AXIOS INSTANCE
   ═══════════════════════════════════════════════════════════════ */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,                // 15 s
  headers: {
    'Content-Type': 'application/json',
    Accept:         'application/json',
  },
});

/* ── Token helpers ───────────────────────────────────────────── */
const getToken = () => localStorage.getItem('foodie_token');

/* ── Request interceptor — inject Bearer token ───────────────── */
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/* ── Response interceptor — normalise errors ─────────────────── */
api.interceptors.response.use(
  /* Success: just return the response */
  (response) => response,

  /* Error: normalise into a consistent shape */
  (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Something went wrong';

    /* 401 — token expired / invalid → clear session & redirect */
    if (status === 401) {
      localStorage.removeItem('foodie_token');
      localStorage.removeItem('foodie_user');
      /* Fire a custom event so AuthContext can react without coupling */
      window.dispatchEvent(new CustomEvent('auth:expired'));
      /* Only redirect if we're not already on an auth page */
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    /* 403 — forbidden */
    if (status === 403) {
      window.dispatchEvent(new CustomEvent('auth:forbidden'));
    }

    /* 503 / network error — server down */
    if (!error.response) {
      console.error('[api] Network error — server may be unreachable');
    }

    /* Attach normalised info to error so callers don't need to dig */
    error.status  = status;
    error.message = message;

    return Promise.reject(error);
  },
);

/* ── Convenience wrappers (tree-shakeable) ───────────────────── */

/**
 * GET  /endpoint
 * @param {string} url
 * @param {object} [params]  — query-string params
 * @param {object} [config]  — extra axios config
 */
export const get = (url, params = {}, config = {}) =>
  api.get(url, { params, ...config });

/**
 * POST  /endpoint
 * @param {string} url
 * @param {object} [data]
 * @param {object} [config]
 */
export const post = (url, data = {}, config = {}) =>
  api.post(url, data, config);

/**
 * PUT  /endpoint
 * @param {string} url
 * @param {object} [data]
 * @param {object} [config]
 */
export const put = (url, data = {}, config = {}) =>
  api.put(url, data, config);

/**
 * PATCH  /endpoint
 */
export const patch = (url, data = {}, config = {}) =>
  api.patch(url, data, config);

/**
 * DELETE  /endpoint
 */
export const del = (url, config = {}) =>
  api.delete(url, config);

/**
 * POST multipart/form-data (file uploads)
 * @param {string}   url
 * @param {FormData} formData
 * @param {Function} [onProgress]  — receives 0-100
 */
export const upload = (url, formData, onProgress) =>
  api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
      : undefined,
  });

/* Default export: the raw Axios instance (for advanced use) */
export default api;