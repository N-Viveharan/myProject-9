import { useContext, useEffect, useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import './ProtectedRoute.css';

/* ── Checking skeleton ───────────────────────────────────────── */
function CheckingAuth() {
  return (
    <div className="pr-checking" role="status" aria-label="Verifying your session…">
      <div className="pr-checking__inner">
        <div className="pr-checking__logo" aria-hidden="true">🍜</div>
        <span className="pr-checking__text">Verifying your session…</span>
        <div className="pr-checking__bars" aria-hidden="true">
          <div className="pr-checking__bar" />
          <div className="pr-checking__bar" />
          <div className="pr-checking__bar" />
        </div>
      </div>
    </div>
  );
}

/* ── Not-logged-in gate ──────────────────────────────────────── */
function AuthRequired({ redirectTo, countdown }) {
  return (
    <div className="pr-denied">
      <div className="pr-denied__card" role="main">

        <div className="pr-denied__icon-wrap">
          <div className="pr-denied__icon-bg pr-denied__icon-bg--lock" aria-hidden="true">
            🔐
          </div>
          <div className="pr-denied__icon-ring" aria-hidden="true" />
        </div>

        <span className="pr-denied__badge pr-denied__badge--auth">
          🔒 Login Required
        </span>

        <h1 className="pr-denied__title">Sign in to continue</h1>

        <p className="pr-denied__desc">
          This page is only available to signed-in members.
          <br />
          <strong>Create a free account</strong> or log in to get full access.
        </p>

        <div className="pr-denied__actions">
          <Link
            to={`/login?redirect=${encodeURIComponent(redirectTo)}`}
            className="pr-denied__btn pr-denied__btn--primary"
          >
            <span aria-hidden="true">👤</span> Log in
          </Link>

          <div className="pr-denied__or">or</div>

          <Link
            to="/register"
            className="pr-denied__btn pr-denied__btn--secondary"
          >
            <span aria-hidden="true">✨</span> Create a free account
          </Link>

          <Link to="/" className="pr-denied__btn pr-denied__btn--secondary">
            <span aria-hidden="true">🏠</span> Back to Home
          </Link>
        </div>

        {countdown !== null && (
          <div className="pr-denied__countdown" aria-live="polite">
            <span aria-hidden="true">↩️</span>
            Redirecting to login in
            <span className="pr-denied__countdown-num">{countdown}</span>
            {countdown === 1 ? 'second' : 'seconds'}…
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Role denied page ────────────────────────────────────────── */
function RoleDenied({ requiredRole, userRole }) {
  const roleLabel = requiredRole.charAt(0).toUpperCase() + requiredRole.slice(1);

  return (
    <div className="pr-denied">
      <div className="pr-denied__card" role="main">

        <div className="pr-denied__icon-wrap">
          <div className="pr-denied__icon-bg pr-denied__icon-bg--shield" aria-hidden="true">
            🛡️
          </div>
          <div className="pr-denied__icon-ring" aria-hidden="true" />
        </div>

        <span className="pr-denied__badge pr-denied__badge--role">
          ⛔ Access Denied
        </span>

        <h1 className="pr-denied__title">Restricted area</h1>

        <p className="pr-denied__desc">
          This page requires <strong>{roleLabel}</strong> privileges.
          Your current role (<strong>{userRole || 'user'}</strong>) does not
          have permission to view this content.
        </p>

        <div className="pr-denied__actions">
          <Link to="/" className="pr-denied__btn pr-denied__btn--primary">
            <span aria-hidden="true">🏠</span> Go to Home
          </Link>

          <div className="pr-denied__or">or</div>

          <Link to="/orders" className="pr-denied__btn pr-denied__btn--secondary">
            <span aria-hidden="true">📦</span> My Orders
          </Link>

          <Link to="/products" className="pr-denied__btn pr-denied__btn--secondary">
            <span aria-hidden="true">🍽️</span> Browse Menu
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── ProtectedRoute ──────────────────────────────────────────── */
/**
 * ProtectedRoute
 *
 * Props:
 *   children         {ReactNode}  — the page to render when allowed
 *   requiredRole     {string}     — 'admin' | 'user' | undefined (any auth)
 *   redirectDelay    {number}     — seconds before auto-redirect (default 5, 0 = instant)
 *   showDeniedPage   {boolean}    — show access-denied UI instead of hard redirect (default true)
 *
 * Usage:
 *   // Any logged-in user
 *   <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
 *
 *   // Admin only
 *   <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
 *
 *   // Instant redirect, no UI
 *   <Route path="/checkout" element={<ProtectedRoute showDeniedPage={false}><Checkout /></ProtectedRoute>} />
 */
export default function ProtectedRoute({
  children,
  requiredRole   = null,
  redirectDelay  = 5,
  showDeniedPage = true,
}) {
  const { user, loading } = useContext(AuthContext);
  const location          = useLocation();
  const [countdown, setCountdown] = useState(redirectDelay > 0 ? redirectDelay : null);
  const [doRedirect, setDoRedirect] = useState(redirectDelay === 0);

  const isAuthenticated = Boolean(user);
  const hasRole         = !requiredRole || user?.role === requiredRole;

  /* ── Countdown timer (for auth-required only) ─────────────── */
  useEffect(() => {
    if (loading || isAuthenticated || !showDeniedPage || redirectDelay === 0) return;
    if (countdown === null) return;

    if (countdown <= 0) {
      setDoRedirect(true);
      return;
    }

    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, loading, isAuthenticated, showDeniedPage, redirectDelay]);

  /* ── 1. Still verifying token ─────────────────────────────── */
  if (loading) {
    return <CheckingAuth />;
  }

  /* ── 2. Not authenticated ─────────────────────────────────── */
  if (!isAuthenticated) {
    const redirectTo = location.pathname + location.search;

    // Instant redirect (no UI) or countdown expired
    if (!showDeniedPage || doRedirect) {
      return (
        <Navigate
          to={`/login?redirect=${encodeURIComponent(redirectTo)}`}
          replace
        />
      );
    }

    // Show friendly auth-required page with countdown
    return <AuthRequired redirectTo={redirectTo} countdown={countdown} />;
  }

  /* ── 3. Authenticated but wrong role ──────────────────────── */
  if (!hasRole) {
    if (!showDeniedPage) {
      return <Navigate to="/" replace />;
    }
    return <RoleDenied requiredRole={requiredRole} userRole={user.role} />;
  }

  /* ── 4. All checks passed ─────────────────────────────────── */
  return children;
}