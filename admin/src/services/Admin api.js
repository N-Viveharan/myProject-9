/**
 * api.js — Admin Axios instance
 * ─────────────────────────────────────────────────────────────
 * • Attaches admin JWT from localStorage on every request
 * • Normalises error responses to { message, status, data }
 * • Auto-redirects to /admin/login on 401 (token expired/invalid)
 * • Retries once on network failures (not on 4xx/5xx)
 * • Exposes token helpers used by the auth context
 * ─────────────────────────────────────────────────────────────
 */

import axios from 'axios';

/* ── Constants ───────────────────────────────────────────────── */
const BASE_URL    = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TOKEN_KEY   = 'foodie_admin_token';
const ADMIN_KEY   = 'foodie_admin_user';
const TIMEOUT_MS  = 15_000;

/* ── Token helpers (exported for use in auth context) ────────── */
export const tokenHelpers = {
  get:    ()    => localStorage.getItem(TOKEN_KEY),
  set:    (t)   => localStorage.setItem(TOKEN_KEY, t),
  remove: ()    => localStorage.removeItem(TOKEN_KEY),
  getUser:()    => {
    try { return JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null'); }
    catch { return null; }
  },
  setUser:(u)   => localStorage.setItem(ADMIN_KEY, JSON.stringify(u)),
  clear:  ()    => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
  },
};

/* ── Decode JWT (no library) ─────────────────────────────────── */
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
  return decoded.exp * 1000 < Date.now() + 10_000;
};

/* ── Create Axios instance ───────────────────────────────────── */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ════════════════════════════════════════════════════════════
   REQUEST INTERCEPTOR — attach admin JWT
   ════════════════════════════════════════════════════════════ */
api.interceptors.request.use(
  (config) => {
    const token = tokenHelpers.get();

    if (token) {
      /* Check expiry before sending */
      if (isTokenExpired(token)) {
        tokenHelpers.clear();
        redirectToLogin();
        return Promise.reject(new Error('Session expired'));
      }
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    /* Don't force application/json for FormData (file uploads) */
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    /* Attach request timestamp for debugging */
    config._requestTime = Date.now();

    return config;
  },
  (error) => Promise.reject(normaliseError(error))
);

/* ════════════════════════════════════════════════════════════
   RESPONSE INTERCEPTOR — normalise errors, handle 401
   ════════════════════════════════════════════════════════════ */
api.interceptors.response.use(
  /* Success — return data directly */
  (response) => {
    const ms = Date.now() - (response.config._requestTime || Date.now());
    if (import.meta.env.DEV) {
      console.debug(`✅ [API] ${response.config.method?.toUpperCase()} ${response.config.url} — ${ms}ms`);
    }
    return response.data;
  },

  /* Error */
  async (error) => {
    const { config, response } = error;

    /* ── 401: Token rejected by server ──────────────────── */
    if (response?.status === 401) {
      tokenHelpers.clear();
      redirectToLogin();
      return Promise.reject(normaliseError(error));
    }

    /* ── 403: Not an admin ───────────────────────────────── */
    if (response?.status === 403) {
      console.error('[API] Access denied — admin role required');
      return Promise.reject(normaliseError(error));
    }

    /* ── Network failure: retry once ─────────────────────── */
    if (!response && !config?._retried) {
      config._retried = true;
      console.warn('[API] Network error — retrying…');
      await sleep(800);
      return api(config);
    }

    if (import.meta.env.DEV) {
      console.error(
        `❌ [API] ${config?.method?.toUpperCase()} ${config?.url}`,
        response?.status,
        response?.data
      );
    }

    return Promise.reject(normaliseError(error));
  }
);

/* ── Redirect helper ─────────────────────────────────────────── */
function redirectToLogin() {
  if (!window.location.pathname.includes('/admin/login')) {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/admin/login?redirect=${returnTo}`;
  }
}

/* ── Error normaliser ────────────────────────────────────────── */
function normaliseError(error) {
  const response = error?.response;
  const message  =
    response?.data?.message ||
    response?.data?.error   ||
    (Array.isArray(response?.data?.errors)
      ? response.data.errors.map((e) => e.msg).join(', ')
      : null)                ||
    error?.message          ||
    'Something went wrong';

  const normalised      = new Error(message);
  normalised.status     = response?.status || 0;
  normalised.data       = response?.data   || null;
  normalised.isApiError = true;
  return normalised;
}

/* ── Utility ─────────────────────────────────────────────────── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ════════════════════════════════════════════════════════════
   RESOURCE HELPERS
   Thin wrappers that keep route strings in one place.
   ════════════════════════════════════════════════════════════ */

/* ── Auth ────────────────────────────────────────────────────── */
export const authApi = {
  login:  (credentials)    => api.post('/auth/login', credentials),
  logout: ()               => api.post('/auth/logout'),
  me:     ()               => api.get('/auth/me'),
};

/* ── Products ────────────────────────────────────────────────── */
export const productApi = {
  getAll:   (params)       => api.get('/products', { params }),
  getById:  (id)           => api.get(`/products/${id}`),
  create:   (formData)     => api.post('/products', formData),
  update:   (id, formData) => api.put(`/products/${id}`, formData),
  delete:   (id)           => api.delete(`/products/${id}`),
  toggleAvail:  (id, isAvailable)  => api.put(`/products/${id}`, { isAvailable }),
  toggleFeatured:(id, isFeatured) => api.put(`/products/${id}`, { isFeatured }),
  addReview:(id, data)     => api.post(`/products/${id}/reviews`, data),
  getCategories: ()        => api.get('/products/categories'),
};

/* ── Orders ──────────────────────────────────────────────────── */
export const orderApi = {
  getAll:      (params)           => api.get('/orders', { params }),
  getById:     (id)               => api.get(`/orders/${id}`),
  getMyOrders: (params)           => api.get('/orders/my', { params }),
  updateStatus:(id, status, reason) =>
    api.put(`/orders/${id}/status`, { status, reason }),
  cancel:      (id, reason)       => api.put(`/orders/${id}/cancel`, { reason }),
  dashboard:   ()                 => api.get('/orders/dashboard'),
};



/* ── Users ───────────────────────────────────────────────────── */
export const userApi = {
  getAll:      (params)           => api.get('/users', { params }),
  getById:     (id)               => api.get(`/users/${id}`),
  updateRole:  (id, role)         => api.put(`/users/${id}`, { role }),
  updateStatus:(id, isActive)     => api.put(`/users/${id}`, { isActive }),
  update:      (id, data)         => api.put(`/users/${id}`, data),
  delete:      (id)               => api.delete(`/users/${id}`),
  profile:     ()                 => api.get('/users/profile'),
  updateProfile:(data)            => api.put('/users/profile', data),
  changePassword:(data)           => api.put('/users/change-password', data),
};

/* Default export is the raw Axios instance (for one-off requests) */
export default api;