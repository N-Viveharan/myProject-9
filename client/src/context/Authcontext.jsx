import { createContext, useState, useEffect, useCallback, useRef } from 'react';

/* ── API base URL ────────────────────────────────────────────── */
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/* ── Token helpers ───────────────────────────────────────────── */
const TOKEN_KEY = 'foodie_token';
const USER_KEY  = 'foodie_user';

const storage = {
  getToken:   ()      => localStorage.getItem(TOKEN_KEY),
  setToken:   (t)     => localStorage.setItem(TOKEN_KEY, t),
  removeToken:()      => localStorage.removeItem(TOKEN_KEY),
  getUser:    ()      => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); }
    catch { return null; }
  },
  setUser:    (u)     => localStorage.setItem(USER_KEY, JSON.stringify(u)),
  removeUser: ()      => localStorage.removeItem(USER_KEY),
  clear:      ()      => { storage.removeToken(); storage.removeUser(); },
};

/* ── JWT decode (no library needed) ─────────────────────────── */
const decodeToken = (token) => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;
  // Add 10-second buffer
  return decoded.exp * 1000 < Date.now() + 10_000;
};

/* ── Fetch wrapper with auth header ──────────────────────────── */
const authFetch = async (url, options = {}, token = null) => {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

/* ── Context ─────────────────────────────────────────────────── */
export const AuthContext = createContext(null);

/* ── Provider ────────────────────────────────────────────────── */
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => storage.getUser());
  const [token,   setToken]   = useState(() => storage.getToken());
  const [loading, setLoading] = useState(true);   // true on mount → verifying stored token
  const [error,   setError]   = useState(null);

  const refreshTimer = useRef(null);

  /* ── Persist helpers ──────────────────────────────────────── */
  const persistSession = useCallback((newToken, newUser) => {
    storage.setToken(newToken);
    storage.setUser(newUser);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const clearSession = useCallback(() => {
    storage.clear();
    setToken(null);
    setUser(null);
    clearTimeout(refreshTimer.current);
  }, []);

  /* ── Auto-logout when token expires ──────────────────────── */
  const scheduleExpiry = useCallback((tkn) => {
    clearTimeout(refreshTimer.current);
    const decoded = decodeToken(tkn);
    if (!decoded?.exp) return;
    const msUntilExpiry = decoded.exp * 1000 - Date.now() - 5_000;
    if (msUntilExpiry <= 0) { clearSession(); return; }
    refreshTimer.current = setTimeout(() => {
      clearSession();
      // Optionally dispatch a custom event so UI can show a toast
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }, msUntilExpiry);
  }, [clearSession]);

  /* ── Verify stored token on mount ────────────────────────── */
  useEffect(() => {
    const verify = async () => {
      const storedToken = storage.getToken();

      if (!storedToken || isTokenExpired(storedToken)) {
        clearSession();
        setLoading(false);
        return;
      }

      try {
        const data = await authFetch('/auth/me', {}, storedToken);
        persistSession(storedToken, data.user);
        scheduleExpiry(storedToken);
      } catch {
        // Token rejected by server — clear it
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    verify();

    return () => clearTimeout(refreshTimer.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Register ────────────────────────────────────────────── */
  const register = useCallback(async ({ name, email, password }) => {
    setError(null);
    setLoading(true);
    try {
      const data = await authFetch('/auth/register', {
        method: 'POST',
        body:   JSON.stringify({ name, email, password }),
      });
      persistSession(data.token, data.user);
      scheduleExpiry(data.token);
      return { success: true, user: data.user };
    } catch (err) {
      const msg = err.message || 'Registration failed';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [persistSession, scheduleExpiry]);

  /* ── Login ───────────────────────────────────────────────── */
  const login = useCallback(async ({ email, password }) => {
    setError(null);
    setLoading(true);
    try {
      const data = await authFetch('/auth/login', {
        method: 'POST',
        body:   JSON.stringify({ email, password }),
      });
      persistSession(data.token, data.user);
      scheduleExpiry(data.token);
      return { success: true, user: data.user };
    } catch (err) {
      const msg = err.message || 'Login failed';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [persistSession, scheduleExpiry]);

  /* ── Logout ──────────────────────────────────────────────── */
  const logout = useCallback(async () => {
    try {
      // Fire-and-forget server logout
      if (token) {
        authFetch('/auth/logout', { method: 'POST' }, token).catch(() => {});
      }
    } finally {
      clearSession();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  }, [token, clearSession]);

  /* ── Update profile (local state sync) ───────────────────── */
  const updateProfile = useCallback(async (updates) => {
    setError(null);
    try {
      const data = await authFetch('/users/profile', {
        method: 'PUT',
        body:   JSON.stringify(updates),
      }, token);
      const updatedUser = { ...user, ...data.user };
      storage.setUser(updatedUser);
      setUser(updatedUser);
      return { success: true, user: updatedUser };
    } catch (err) {
      const msg = err.message || 'Update failed';
      setError(msg);
      return { success: false, message: msg };
    }
  }, [token, user]);

  /* ── Change password ─────────────────────────────────────── */
  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    setError(null);
    try {
      await authFetch('/users/change-password', {
        method: 'PUT',
        body:   JSON.stringify({ currentPassword, newPassword }),
      }, token);
      return { success: true };
    } catch (err) {
      const msg = err.message || 'Password change failed';
      setError(msg);
      return { success: false, message: msg };
    }
  }, [token]);

  /* ── Role helpers ────────────────────────────────────────── */
  const isAdmin = user?.role === 'admin';
  const isLoggedIn = Boolean(user && token && !isTokenExpired(token));

  /* ── Clear error ─────────────────────────────────────────── */
  const clearError = useCallback(() => setError(null), []);

  /* ── Context value ───────────────────────────────────────── */
  const value = {
    // State
    user,
    token,
    loading,
    error,
    isAdmin,
    isLoggedIn,
    // Actions
    login,
    logout,
    register,
    updateProfile,
    changePassword,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}