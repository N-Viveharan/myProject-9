/**
 * api.js — Frontend Axios Instance
 * ─────────────────────────────────────────────────────────────
 * • Base URL from VITE_API_BASE_URL environment variable
 * • Request interceptor: attaches user JWT on every request
 * • Response interceptor: unwraps data, normalises errors
 * • 401 handler: clears token + redirects to /login
 * • Network retry: retries once on connection failure
 * • FormData support: auto-removes Content-Type for file uploads
 * ─────────────────────────────────────────────────────────────
 */

import axios from 'axios';

/* ── Constants ───────────────────────────────────────────────── */
const BASE_URL   = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TOKEN_KEY  = 'foodie_token';
const TIMEOUT_MS = 15_000;

/* ════════════════════════════════════════════════════════════
   TOKEN HELPERS
   Exported so AuthContext can read/write without importing
   localStorage keys in multiple places.
   ════════════════════════════════════════════════════════════ */
export const tokenHelpers = {
  get:    ()    => localStorage.getItem(TOKEN_KEY),
  set:    (t)   => localStorage.setItem(TOKEN_KEY, t),
  remove: ()    => localStorage.removeItem(TOKEN_KEY),
};

/* ════════════════════════════════════════════════════════════
   JWT DECODE HELPERS (no library needed)
   ════════════════════════════════════════════════════════════ */
export const decodeToken = (token) => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
};

export const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;
  return decoded.exp * 1000 < Date.now() + 10_000; // 10s buffer
};

/* ════════════════════════════════════════════════════════════
   AXIOS INSTANCE
   ════════════════════════════════════════════════════════════ */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ════════════════════════════════════════════════════════════
   REQUEST INTERCEPTOR
   Attaches Bearer token before every request.
   For FormData (image uploads) removes Content-Type so the
   browser sets the correct multipart boundary automatically.
   ════════════════════════════════════════════════════════════ */
api.interceptors.request.use(
  (config) => {
    const token = tokenHelpers.get();

    if (token) {
      if (isTokenExpired(token)) {
        // Wipe stale token — don't bother sending the request
        tokenHelpers.remove();
        redirectToLogin(config.url);
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Let browser set Content-Type boundary for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // Timestamp for DEV latency logging
    config._requestTime = Date.now();

    return config;
  },
  (error) => Promise.reject(normaliseError(error))
);

/* ════════════════════════════════════════════════════════════
   RESPONSE INTERCEPTOR
   ════════════════════════════════════════════════════════════ */
api.interceptors.response.use(

  /* ── Success: unwrap response.data ────────────────────── */
  (response) => {
    if (import.meta.env.DEV) {
      const ms = Date.now() - (response.config._requestTime || Date.now());
      console.debug(
        `%c✅ ${response.config.method?.toUpperCase()} ${response.config.url} — ${ms}ms`,
        'color:#2ecc71'
      );
    }
    return response.data;
  },

  /* ── Error handling ────────────────────────────────────── */
  async (error) => {
    const { config, response } = error;

    /* 401 — token rejected by server */
    if (response?.status === 401) {
      tokenHelpers.remove();
      redirectToLogin(config?.url);
      return Promise.reject(normaliseError(error));
    }

    /* 403 — authenticated but not authorised */
    if (response?.status === 403) {
      if (import.meta.env.DEV) {
        console.warn('[api] 403 Forbidden:', config?.url);
      }
      return Promise.reject(normaliseError(error));
    }

    /* Network failure (no response) — retry once */
    if (!response && !config?._retried) {
      config._retried = true;
      if (import.meta.env.DEV) {
        console.warn('[api] Network error, retrying…', config?.url);
      }
      await sleep(800);
      return api(config);
    }

    if (import.meta.env.DEV) {
      console.error(
        `%c❌ ${config?.method?.toUpperCase()} ${config?.url} — ${response?.status}`,
        'color:#e74c3c',
        response?.data
      );
    }

    return Promise.reject(normaliseError(error));
  }
);

/* ════════════════════════════════════════════════════════════
   ERROR NORMALISER
   Extracts a human-readable message from any Axios error shape.
   ════════════════════════════════════════════════════════════ */
function normaliseError(error) {
  const response = error?.response;

  /* Try every shape the backend might return */
  const message =
    response?.data?.message ||
    response?.data?.error   ||
    (Array.isArray(response?.data?.errors)
      ? response.data.errors.map((e) => e.msg || e.message).join(', ')
      : null)                ||
    error?.message          ||
    'Something went wrong. Please try again.';

  const err        = new Error(message);
  err.status       = response?.status || 0;
  err.data         = response?.data   || null;
  err.isApiError   = true;
  return err;
}

/* ════════════════════════════════════════════════════════════
   REDIRECT HELPER
   Preserves the current path as ?redirect= so the user
   lands back after logging in.
   ════════════════════════════════════════════════════════════ */
function redirectToLogin(fromUrl = '') {
  const currentPath = window.location.pathname + window.location.search;
  const loginPath   = '/login';

  if (window.location.pathname === loginPath) return; // already there

  const redirect = encodeURIComponent(currentPath);
  window.location.href = `${loginPath}?redirect=${redirect}`;
}

/* ── Utility ──────────────────────────────────────────────── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ════════════════════════════════════════════════════════════
   RESOURCE HELPERS
   Thin wrappers keeping all route strings in one place.
   Import these in service files instead of calling api directly.
   ════════════════════════════════════════════════════════════ */

/* ── Auth ──────────────────────────────────────────────────── */
export const authApi = {
  register: (data)        => api.post('/auth/register', data),
  login:    (data)        => api.post('/auth/login', data),
  logout:   ()            => api.post('/auth/logout'),
  me:       ()            => api.get('/auth/me'),
};

/* ── Products ──────────────────────────────────────────────── */
export const productApi = {
  getAll:     (params)    => api.get('/products', { params }),
  getById:    (id)        => api.get(`/products/${id}`),
  getFeatured:(params)    => api.get('/products', { params: { isFeatured: true, ...params } }),
  getCategories: ()       => api.get('/products/categories'),
  addReview:  (id, data)  => api.post(`/products/${id}/reviews`, data),
};

/* ── Orders ────────────────────────────────────────────────── */
export const orderApi = {
  place:      (data)      => api.post('/orders', data),
  getMyOrders:(params)    => api.get('/orders/my', { params }),
  getById:    (id)        => api.get(`/orders/${id}`),
  cancel:     (id, reason)=> api.put(`/orders/${id}/cancel`, { reason }),
};

/* ── Users ─────────────────────────────────────────────────── */
export const userApi = {
  getProfile:      ()     => api.get('/users/profile'),
  updateProfile:   (data) => api.put('/users/profile', data),
  changePassword:  (data) => api.put('/users/change-password', data),
};

/* Default export is the raw Axios instance for one-off requests */
export default api;