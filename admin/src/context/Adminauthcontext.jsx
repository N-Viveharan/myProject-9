/**
 * AdminAuthContext.jsx — Admin Authentication Context
 * ─────────────────────────────────────────────────────────────
 * Manages the admin session lifecycle:
 *   • Reads persisted token from localStorage on mount
 *   • Verifies token against GET /auth/me before trusting it
 *   • Enforces role === 'admin' — regular users are rejected
 *   • Schedules auto-logout when the JWT expires
 *   • Dispatches 'admin:expired' and 'admin:logout' DOM events
 * ─────────────────────────────────────────────────────────────
 */

import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import api, { tokenHelpers, isTokenExpired, decodeToken } from '../services/api.js';

export const AdminAuthContext = createContext(null);

/* ── Local storage keys ──────────────────────────────────────── */
const ADMIN_USER_KEY = 'foodie_admin_user';

const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem(ADMIN_USER_KEY) || 'null'); }
  catch { return null; }
};

const setStoredUser = (u) => {
  try { localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(u)); } catch {}
};

const removeStoredUser = () => {
  try { localStorage.removeItem(ADMIN_USER_KEY); } catch {}
};

/* ════════════════════════════════════════════════════════════
   PROVIDER
   ════════════════════════════════════════════════════════════ */
export function AdminAuthProvider({ children }) {
  const [admin,   setAdmin]   = useState(() => getStoredUser());
  const [token,   setToken]   = useState(() => tokenHelpers.get());
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const expiryTimer = useRef(null);

  /* ── Persist session to storage + state ─────────────────── */
  const persistSession = useCallback((newToken, newUser) => {
    tokenHelpers.set(newToken);
    setStoredUser(newUser);
    setToken(newToken);
    setAdmin(newUser);
  }, []);

  /* ── Clear session from storage + state ─────────────────── */
  const clearSession = useCallback(() => {
    tokenHelpers.remove();
    removeStoredUser();
    setToken(null);
    setAdmin(null);
    clearTimeout(expiryTimer.current);
  }, []);

  /* ── Schedule auto-logout when JWT nears expiry ─────────── */
  const scheduleExpiry = useCallback((tkn) => {
    clearTimeout(expiryTimer.current);
    const decoded = decodeToken(tkn);
    if (!decoded?.exp) return;

    /* Fire 5 seconds before the token actually expires */
    const msLeft = decoded.exp * 1000 - Date.now() - 5_000;
    if (msLeft <= 0) { clearSession(); return; }

    expiryTimer.current = setTimeout(() => {
      clearSession();
      window.dispatchEvent(new CustomEvent('admin:expired'));
    }, msLeft);
  }, [clearSession]);

  /* ── Verify stored token on every mount ─────────────────── */
  useEffect(() => {
    const verify = async () => {
      const storedToken = tokenHelpers.get();

      /* No token or already expired — clear and stop */
      if (!storedToken || isTokenExpired(storedToken)) {
        clearSession();
        setLoading(false);
        return;
      }

      try {
        const data = await api.get('/auth/me');
        const user = data.user || data;

        /* Reject non-admin roles even with a valid token */
        if (user.role !== 'admin') {
          clearSession();
          setError('Access restricted to administrators only.');
          setLoading(false);
          return;
        }

        /* Reject deactivated accounts */
        if (!user.isActive) {
          clearSession();
          setError('This admin account has been deactivated.');
          setLoading(false);
          return;
        }

        persistSession(storedToken, user);
        scheduleExpiry(storedToken);
      } catch {
        /* Token rejected by server (revoked, tampered, etc.) */
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    verify();
    return () => clearTimeout(expiryTimer.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Login ──────────────────────────────────────────────── */
  const login = useCallback(async ({ email, password }) => {
    setError(null);
    setLoading(true);

    try {
      const data = await api.post('/auth/login', { email, password });
      const user = data.user;

      if (!user) throw new Error('Invalid server response — no user returned.');

      if (user.role !== 'admin') {
        throw new Error('Access denied. This panel is for administrators only.');
      }

      if (!user.isActive) {
        throw new Error('This account has been deactivated. Contact support.');
      }

      persistSession(data.token, user);
      scheduleExpiry(data.token);
      return { success: true, user };

    } catch (err) {
      const msg = err.message || 'Login failed. Please try again.';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [persistSession, scheduleExpiry]);

  /* ── Logout ─────────────────────────────────────────────── */
  const logout = useCallback(async () => {
    try {
      /* Fire-and-forget — clear locally regardless of server response */
      api.post('/auth/logout').catch(() => {});
    } finally {
      clearSession();
      window.dispatchEvent(new CustomEvent('admin:logout'));
    }
  }, [clearSession]);

  /* ── Update admin profile in local state ────────────────── */
  const updateAdminProfile = useCallback(async (updates) => {
    setError(null);
    try {
      const data        = await api.put('/users/profile', updates);
      const updatedUser = { ...admin, ...data.user };
      setStoredUser(updatedUser);
      setAdmin(updatedUser);
      return { success: true, user: updatedUser };
    } catch (err) {
      const msg = err.message || 'Profile update failed.';
      setError(msg);
      return { success: false, message: msg };
    }
  }, [admin]);

  /* ── Change password ────────────────────────────────────── */
  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    setError(null);
    try {
      await api.put('/users/change-password', { currentPassword, newPassword });
      return { success: true };
    } catch (err) {
      const msg = err.message || 'Password change failed.';
      setError(msg);
      return { success: false, message: msg };
    }
  }, []);

  /* ── Clear error ────────────────────────────────────────── */
  const clearError = useCallback(() => setError(null), []);

  /* ── Derived flags ──────────────────────────────────────── */
  const isLoggedIn = Boolean(
    admin &&
    token &&
    !isTokenExpired(token) &&
    admin.role === 'admin'
  );

  /* ── Context value ──────────────────────────────────────── */
  const value = {
    /* State */
    admin,
    token,
    loading,
    error,
    isLoggedIn,
    /* Actions */
    login,
    logout,
    updateAdminProfile,
    changePassword,
    clearError,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}