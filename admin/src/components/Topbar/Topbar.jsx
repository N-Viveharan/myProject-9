import { useState, useEffect, useRef, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Topbar.css';

/* ── Breadcrumb map ──────────────────────────────────────────── */
const ROUTE_LABELS = {
  admin:      'Dashboard',
  products:   'Food Items',
  orders:     'Orders',
  users:      'Customers',
  reviews:    'Reviews',
  settings:   'Settings',
  analytics:  'Analytics',
  new:        'Add New',
  edit:       'Edit',
  categories: 'Categories',
};

/* ── Live clock ──────────────────────────────────────────────── */
function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="topbar-datetime" aria-label="Current time">
      <span className="topbar-datetime__dot" aria-hidden="true" />
      {time.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
      &nbsp;·&nbsp;
      {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
    </div>
  );
}

/* ── Notifications panel ─────────────────────────────────────── */
const DEMO_NOTIFS = [
  { id: 1, icon: '📦', msg: 'New order #A3F1 just placed — ₹640',  time: '2 min ago',  unread: true  },
  { id: 2, icon: '⭐', msg: 'New 5-star review on Butter Chicken',  time: '18 min ago', unread: true  },
  { id: 3, icon: '⚠️', msg: 'Low stock: Paneer Tikka Pizza (3 left)',time:'1 hr ago',  unread: false },
  { id: 4, icon: '👤', msg: 'New customer registered: Priya S.',    time: '3 hr ago',  unread: false },
];

function NotifPanel({ onClose }) {
  const [notifs, setNotifs] = useState(DEMO_NOTIFS);
  const unreadCount = notifs.filter((n) => n.unread).length;

  return (
    <div className="topbar-notif-panel" role="dialog" aria-label="Notifications">
      <div className="topbar-notif-header">
        <span className="topbar-notif-title">
          Notifications{unreadCount > 0 && ` (${unreadCount})`}
        </span>
        <button
          className="topbar-notif-clear"
          onClick={() => setNotifs((p) => p.map((n) => ({ ...n, unread: false })))}
          aria-label="Mark all as read"
        >
          Mark all read
        </button>
      </div>

      {notifs.length === 0 ? (
        <div className="topbar-notif-empty">
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🎉</div>
          All caught up!
        </div>
      ) : (
        notifs.map((n) => (
          <div
            key={n.id}
            className={`topbar-notif-item${n.unread ? ' topbar-notif-item--unread' : ''}`}
            onClick={() => {
              setNotifs((p) => p.map((x) => x.id === n.id ? { ...x, unread: false } : x));
            }}
            role="button"
            tabIndex={0}
            aria-label={n.msg}
          >
            <div className="topbar-notif-icon" aria-hidden="true">{n.icon}</div>
            <div className="topbar-notif-text">
              <div className="topbar-notif-msg">{n.msg}</div>
              <div className="topbar-notif-time">{n.time}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TOPBAR COMPONENT
   ════════════════════════════════════════════════════════════ */

/**
 * Topbar
 *
 * Props:
 *   user          {object}   — { name, email, role, avatar }
 *   onLogout      {fn}
 *   onOpenMobileSidebar {fn}
 *   notifCount    {number}   — unread notification count
 */
export default function Topbar({
  user              = {},
  onLogout,
  onOpenMobileSidebar,
  notifCount        = 0,
}) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const notifRef  = useRef(null);
  const userRef   = useRef(null);

  const [showNotif,   setShowNotif]   = useState(false);
  const [showUser,    setShowUser]    = useState(false);
  const [localNotifs, setLocalNotifs] = useState(notifCount);

  /* ── Build breadcrumb from pathname ──────────────────────── */
  const crumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map((seg, idx, arr) => ({
      label: ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
      path:  '/' + arr.slice(0, idx + 1).join('/'),
      isLast:idx === arr.length - 1,
    }));

  const pageTitle = crumbs[crumbs.length - 1]?.label || 'Dashboard';

  /* ── Close dropdowns on outside click ───────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (userRef.current  && !userRef.current.contains(e.target))  setShowUser(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Close on Escape ─────────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { setShowNotif(false); setShowUser(false); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  /* ── Logout ──────────────────────────────────────────────── */
  const handleLogout = () => {
    setShowUser(false);
    onLogout?.();
    navigate('/admin/login');
  };

  const getInitials = (name = '') =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'A';

  return (
    <header className="admin-topbar" role="banner">

      {/* ── Mobile hamburger ─────────────────────────────── */}
      <button
        className="topbar-hamburger"
        onClick={onOpenMobileSidebar}
        aria-label="Open navigation menu"
        aria-expanded="false"
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      {/* ── Breadcrumb ────────────────────────────────────── */}
      <nav className="topbar-breadcrumb" aria-label="Breadcrumb">
        {crumbs.map((crumb, i) => (
          <span key={crumb.path} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {i > 0 && <span className="topbar-breadcrumb__sep" aria-hidden="true">›</span>}
            {crumb.isLast ? (
              <span className="topbar-breadcrumb__item topbar-breadcrumb__item--current">
                {crumb.label}
              </span>
            ) : (
              <Link to={crumb.path} className="topbar-breadcrumb__item">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* ── Mobile page title ─────────────────────────────── */}
      <span className="topbar-page-title" aria-hidden="true" style={{ display: 'none' }}>
        {pageTitle}
      </span>

      {/* ── Right actions ─────────────────────────────────── */}
      {/* Live date/time */}
      <LiveClock />

      {/* Search button */}
      <div className="topbar-search">
        <button
          className="topbar-search__btn"
          aria-label="Search (Ctrl K)"
          onClick={() => {
            // Wire to a global search modal or Command Palette
            alert('⌘K — Wire to your command palette / global search');
          }}
        >
          <span aria-hidden="true">🔍</span>
          Search…
          <kbd className="topbar-search__kbd">⌘K</kbd>
        </button>
      </div>

      <div className="topbar-actions">

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="topbar-icon-btn topbar-icon-btn--bell"
            onClick={() => { setShowNotif((v) => !v); setShowUser(false); setLocalNotifs(0); }}
            aria-label={`Notifications${localNotifs > 0 ? `, ${localNotifs} unread` : ''}`}
            aria-expanded={showNotif}
            aria-haspopup="dialog"
          >
            <span className="topbar-bell-icon" aria-hidden="true">🔔</span>
            {localNotifs > 0 && (
              <span className="topbar-icon-btn__badge" aria-hidden="true">
                {localNotifs > 9 ? '9+' : localNotifs}
              </span>
            )}
          </button>

          {showNotif && <NotifPanel onClose={() => setShowNotif(false)} />}
        </div>

        {/* Quick links */}
        <Link
          to="/"
          target="_blank"
          className="topbar-icon-btn"
          aria-label="View live storefront"
          title="View storefront"
        >
          <span aria-hidden="true">🌐</span>
        </Link>

        <Link
          to="/admin/settings"
          className="topbar-icon-btn"
          aria-label="Settings"
          title="Settings"
        >
          <span aria-hidden="true">⚙️</span>
        </Link>
      </div>

      {/* ── User avatar + dropdown ────────────────────────── */}
      <div className="topbar-user" ref={userRef}>
        <button
          className="topbar-user__btn"
          onClick={() => { setShowUser((v) => !v); setShowNotif(false); }}
          aria-expanded={showUser}
          aria-haspopup="menu"
          aria-label={`User menu for ${user.name || 'Admin'}`}
        >
          <div className="topbar-user__avatar">
            {user.avatar
              ? <img src={user.avatar} alt={user.name} />
              : getInitials(user.name)
            }
          </div>
          <span className="topbar-user__name">{user.name?.split(' ')[0] || 'Admin'}</span>
          <span className="topbar-user__chevron" aria-hidden="true">▼</span>
        </button>

        {showUser && (
          <div className="topbar-dropdown" role="menu">
            {/* Header */}
            <div className="topbar-dropdown__header">
              <span className="topbar-dropdown__name">{user.name || 'Admin'}</span>
              <span className="topbar-dropdown__email">{user.email || 'admin@foodieexpress.in'}</span>
              <span className="topbar-dropdown__role">{user.role || 'Administrator'}</span>
            </div>

            <Link
              to="/admin/settings/profile"
              className="topbar-dropdown__item"
              role="menuitem"
              onClick={() => setShowUser(false)}
            >
              <span className="topbar-dropdown__icon">👤</span>
              My Profile
            </Link>

            <Link
              to="/admin/settings"
              className="topbar-dropdown__item"
              role="menuitem"
              onClick={() => setShowUser(false)}
            >
              <span className="topbar-dropdown__icon">⚙️</span>
              Settings
            </Link>

            <Link
              to="/"
              target="_blank"
              className="topbar-dropdown__item"
              role="menuitem"
              onClick={() => setShowUser(false)}
            >
              <span className="topbar-dropdown__icon">🌐</span>
              View Storefront
            </Link>

            <div className="topbar-dropdown__divider" aria-hidden="true" />

            <button
              className="topbar-dropdown__item topbar-dropdown__item--danger"
              role="menuitem"
              onClick={handleLogout}
            >
              <span className="topbar-dropdown__icon">🚪</span>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}