/**
 * App.jsx — Admin Panel Router + Layout
 * ─────────────────────────────────────────────────────────────
 * • Wraps everything in AdminAuthProvider
 * • Defines all /admin/* routes
 * • Layout: collapsible Sidebar + Topbar + page content
 * • AdminRoute guard redirects unauthenticated users to /admin/login
 * ─────────────────────────────────────────────────────────────
 */

import { Suspense, lazy, useState, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AdminAuthProvider, AdminAuthContext } from './context/Adminauthcontext.jsx';
import Sidebar from './components/Sidebar/Sidebar.jsx';
import Topbar  from './components/Topbar/Topbar.jsx';
import Spinner from './components/Spinner/Spinner.jsx';

/* ── Lazy-loaded pages ───────────────────────────────────────── */
const Dashboard      = lazy(() => import('./pages/Dashboard/Dashboard.jsx'));
const ManageProducts = lazy(() => import('./pages/Manageproducts/Manageproducts.jsx'));
const ManageOrders   = lazy(() => import('./pages/Manageorders/Manageorders.jsx'));
const ManageUsers    = lazy(() => import('./pages/Manageusers/Manageusers.jsx'));
const AdminLogin     = lazy(() => import('./pages/AdminLogin/AdminLogin.jsx'));
const AdminSignup    = lazy(() => import('./pages/AdminSignup/AdminSignup.jsx'));
const NotFound       = lazy(() => import('./pages/NotFound/NotFound.jsx'));

/* ── Page loading fallback ───────────────────────────────────── */
const PageLoader = () => (
  <div style={{
    flex:            1,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    minHeight:       '60vh',
    background:      '#111009',
  }}>
    <Spinner variant="dots" size="lg" label="Loading page…" />
  </div>
);

/* ── Session-expired toast ───────────────────────────────────── */
function SessionExpiredToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => { setShow(true); setTimeout(() => setShow(false), 4000); };
    window.addEventListener('admin:expired', handler);
    return () => window.removeEventListener('admin:expired', handler);
  }, []);

  if (!show) return null;
  return (
    <div style={{
      position:      'fixed',
      top:           '1rem',
      right:         '1rem',
      zIndex:        9999,
      background:    '#231f1a',
      border:        '1px solid rgba(231,76,60,0.35)',
      borderRadius:  '12px',
      padding:       '0.85rem 1.25rem',
      color:         '#e74c3c',
      fontSize:      '0.875rem',
      fontWeight:    600,
      display:       'flex',
      alignItems:    'center',
      gap:           '0.5rem',
      boxShadow:     '0 16px 48px rgba(0,0,0,0.5)',
      animation:     'fadeInDown 0.3s ease',
      fontFamily:    'DM Sans, sans-serif',
    }}>
      <span>⏱️</span> Session expired — please log in again.
      <style>{`@keyframes fadeInDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   AUTH GUARD
   Redirects unauthenticated / non-admin users to /admin/login.
   Shows the loading skeleton while session is being verified.
   ════════════════════════════════════════════════════════════ */
function AdminRoute({ children }) {
  const { admin, loading, isLoggedIn } = useContext(AdminAuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', background: '#111009',
      }}>
        <Spinner variant="food" size="xl" label="Verifying admin session…" />
      </div>
    );
  }

  if (!isLoggedIn || admin?.role !== 'admin') {
    return (
      <Navigate
        to={`/admin/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  return children;
}

/* ════════════════════════════════════════════════════════════
   ADMIN LAYOUT — Sidebar + Topbar + content area
   ════════════════════════════════════════════════════════════ */
function AdminLayout({ children }) {
  const { admin, logout } = useContext(AdminAuthContext);

  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  /* Close mobile sidebar on route change */
  const location = useLocation();
  useEffect(() => setMobileOpen(false), [location.pathname]);

  /* Responsive: auto-collapse sidebar on small screens */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const handler = (e) => { if (e.matches) setCollapsed(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const sidebarWidth    = collapsed ? 68 : 240;
  const TOPBAR_HEIGHT   = 64;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#111009' }}>

      {/* Sidebar */}
      <Sidebar
        user             = {admin || {}}
        onLogout         = {logout}
        collapsed        = {collapsed}
        onToggleCollapse = {() => setCollapsed((c) => !c)}
        mobileOpen       = {mobileOpen}
        onCloseMobile    = {() => setMobileOpen(false)}
        badges           = {{ orders: 0, reviews: 0 }}
      />

      {/* Main area (shifts right of sidebar) */}
      <div style={{
        flex:       1,
        marginLeft: sidebarWidth,
        minWidth:   0,
        display:    'flex',
        flexDirection:'column',
        transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* Topbar */}
        <Topbar
          user                = {admin || {}}
          onLogout            = {logout}
          onOpenMobileSidebar = {() => setMobileOpen(true)}
          notifCount          = {0}
        />

        {/* Page content */}
        <main style={{
          flex:      1,
          marginTop: TOPBAR_HEIGHT,
          minWidth:  0,
          overflow:  'auto',
        }}>
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ROUTES
   ════════════════════════════════════════════════════════════ */
function AdminRoutes() {
  const { admin, token } = useContext(AdminAuthContext);

  return (
    <Routes>

      {/* Public — login */}
      <Route
        path="/admin/login"
        element={
          <Suspense fallback={<PageLoader />}>
            <AdminLogin />
          </Suspense>
        }
      />

      {/* Public — signup */}
      <Route
        path="/admin/signup"
        element={
          <Suspense fallback={<PageLoader />}>
            <AdminSignup />
          </Suspense>
        }
      />

      {/* Protected — dashboard */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout>
              <Dashboard user={admin} token={token} />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* Protected — manage products */}
      <Route
        path="/admin/products/*"
        element={
          <AdminRoute>
            <AdminLayout>
              <ManageProducts token={token} />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* Protected — manage orders */}
      <Route
        path="/admin/orders"
        element={
          <AdminRoute>
            <AdminLayout>
              <ManageOrders token={token} />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* Protected — manage users */}
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminLayout>
              <ManageUsers token={token} currentUserId={admin?._id} />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* Redirect /admin/* catch-all to dashboard */}
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/admin" replace />} />

      {/* 404 */}
      <Route
        path="*"
        element={
          <Suspense fallback={<PageLoader />}>
            <NotFound />
          </Suspense>
        }
      />
    </Routes>
  );
}

/* ════════════════════════════════════════════════════════════
   APP ROOT
   ════════════════════════════════════════════════════════════ */
export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <SessionExpiredToast />
        <AdminRoutes />
      </AdminAuthProvider>
    </BrowserRouter>
  );
}