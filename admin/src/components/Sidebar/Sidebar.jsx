import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Package, 
  Users, 
  Star, 
  Gift, 
  Settings, 
  LineChart,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown
} from 'lucide-react';
import './Sidebar.css';

/* ── Nav structure ───────────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { icon: <LayoutDashboard size={20} />, label: 'Dashboard',   path: '/admin',          end: true },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      {
        icon: <UtensilsCrossed size={20} />, label: 'Food Items', path: '/admin/products',
        sub: [
          { label: 'All Products',  path: '/admin/products' },
          { label: 'Add New Item',  path: '/admin/products/new' },
          { label: 'Categories',    path: '/admin/products/categories' },
        ],
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: <Package size={20} />, label: 'Orders',       path: '/admin/orders',  badgeKey: 'orders' },
      { icon: <Users size={20} />, label: 'Customers',    path: '/admin/users' },
      { icon: <Star size={20} />, label: 'Reviews',      path: '/admin/reviews', badgeKey: 'reviews' },
      { icon: <Gift size={20} />, label: 'Offers',       path: '/admin/offers' },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: <Settings size={20} />, label: 'Settings',    path: '/admin/settings' },
      { icon: <LineChart size={20} />, label: 'Analytics',   path: '/admin/analytics' },
    ],
  },
];

/* ── Sub-list component ──────────────────────────────────────── */
function SubList({ items, collapsed }) {
  if (collapsed) return null;
  return (
    <div className="sidebar-sublist sidebar-sublist--open">
      {items.map((sub) => (
        <NavLink
          key={sub.path}
          to={sub.path}
          end
          className={({ isActive }) =>
            `sidebar-subitem${isActive ? ' sidebar-subitem--active' : ''}`
          }
        >
          <span className="sidebar-subitem__dot" aria-hidden="true" />
          {sub.label}
        </NavLink>
      ))}
    </div>
  );
}

/* ── Single nav item ─────────────────────────────────────────── */
function NavItem({ item, collapsed, badges, openSub, onToggleSub }) {
  const hasSub   = item.sub && item.sub.length > 0;
  const isSubOpen= openSub === item.path;
  const badge    = item.badgeKey ? badges[item.badgeKey] : null;

  if (hasSub) {
    return (
      <>
        <button
          className={`sidebar-item${isSubOpen ? ' sidebar-item--active' : ''}`}
          onClick={() => onToggleSub(item.path)}
          aria-expanded={isSubOpen}
          aria-label={item.label}
          title={collapsed ? item.label : undefined}
        >
          <span className="sidebar-item__icon" aria-hidden="true">{item.icon}</span>
          <span className="sidebar-item__label">{item.label}</span>
          {!collapsed && (
            <span style={{ transition: 'transform 0.2s', transform: isSubOpen ? 'rotate(180deg)' : 'none', display: 'flex' }}>
              <ChevronDown size={14} color="var(--sb-text-muted)" />
            </span>
          )}
        </button>
        {isSubOpen && <SubList items={item.sub} collapsed={collapsed} />}
      </>
    );
  }

  return (
    <NavLink
      to={item.path}
      end={item.end}
      className={({ isActive }) =>
        `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
      }
      title={collapsed ? item.label : undefined}
      aria-label={item.label}
    >
      <span className="sidebar-item__icon" aria-hidden="true">{item.icon}</span>
      <span className="sidebar-item__label">{item.label}</span>
      {badge > 0 && (
        <span className="sidebar-item__badge sidebar-item__badge--red" aria-label={`${badge} pending`}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  );
}

/* ════════════════════════════════════════════════════════════
   SIDEBAR COMPONENT
   ════════════════════════════════════════════════════════════ */

/**
 * Sidebar
 *
 * Props:
 *   user          {object}   — { name, email, role }
 *   onLogout      {fn}
 *   collapsed     {boolean}  — controlled from parent
 *   onToggleCollapse {fn}
 *   mobileOpen    {boolean}
 *   onCloseMobile {fn}
 *   badges        {object}   — { orders: 4, reviews: 2 }
 */
export default function Sidebar({
  user          = {},
  onLogout,
  collapsed     = false,
  onToggleCollapse,
  mobileOpen    = false,
  onCloseMobile,
  badges        = {},
}) {
  const navigate  = useNavigate();
  const [openSub, setOpenSub] = useState('');

  const handleToggleSub = (path) => {
    setOpenSub((prev) => (prev === path ? '' : path));
  };

  const handleLogout = () => {
    onLogout?.();
    navigate('/admin/login');
  };

  const getInitials = (name = '') =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'A';

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'admin-sidebar',
          collapsed    ? 'admin-sidebar--collapsed'    : '',
          mobileOpen   ? 'admin-sidebar--mobile-open'  : '',
        ].filter(Boolean).join(' ')}
        aria-label="Admin navigation"
        role="navigation"
      >
        {/* ── Logo ──────────────────────────────────────── */}
        <Link to="/admin" className="sidebar-logo" aria-label="FoodieExpress Admin">
          <div className="sidebar-logo__icon" aria-hidden="true">
            <ChefHat size={28} />
          </div>
          <div className="sidebar-logo__text">
            <span className="sidebar-logo__name">
              Foodie<span>Express</span>
            </span>
            <span className="sidebar-logo__badge">Admin Panel</span>
          </div>
          {!collapsed && (
            <button
              className="sidebar-collapse-btn"
              onClick={(e) => { e.preventDefault(); onToggleCollapse?.(); }}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </Link>

        {/* ── Nav sections ──────────────────────────────── */}
        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section, si) => (
            <div key={section.label} className="sidebar-section">
              <div className="sidebar-section-label">{section.label}</div>

              {section.items.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  collapsed={collapsed}
                  badges={badges}
                  openSub={openSub}
                  onToggleSub={handleToggleSub}
                />
              ))}

              {si < NAV_SECTIONS.length - 1 && (
                <div className="sidebar-divider" aria-hidden="true" />
              )}
            </div>
          ))}

          {/* Logout as nav item */}
          <div className="sidebar-divider" aria-hidden="true" />
          <button
            className="sidebar-item sidebar-item--danger"
            onClick={handleLogout}
            aria-label="Sign out"
            title={collapsed ? 'Sign out' : undefined}
          >
            <span className="sidebar-item__icon" aria-hidden="true"><LogOut size={20} /></span>
            <span className="sidebar-item__label">Sign Out</span>
          </button>
        </nav>

        {/* ── Collapsed expand button ────────────────────── */}
        {collapsed && (
          <div style={{ padding: '0.75rem 0.6rem', borderTop: '1px solid var(--sb-border)' }}>
            <button
              className="sidebar-item"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              style={{ justifyContent: 'center' }}
            >
              <span className="sidebar-item__icon" style={{ margin: 0, display: 'flex', justifyContent: 'center' }}><ChevronRight size={20} /></span>
            </button>
          </div>
        )}

        {/* ── User footer ───────────────────────────────── */}
        <div className="sidebar-footer">
          <div className="sidebar-user" role="complementary" aria-label="Logged in user">
            <div className="sidebar-user__avatar" aria-hidden="true">
              {getInitials(user.name)}
            </div>
            <div className="sidebar-user__info">
              <span className="sidebar-user__name">{user.name || 'Admin'}</span>
              <span className="sidebar-user__role">{user.role || 'Administrator'}</span>
            </div>
            <span className="sidebar-user__status" title="Online" aria-label="Online" />
          </div>
        </div>
      </aside>
    </>
  );
}