import { useState, useEffect, useRef, useContext } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import { CartContext } from '../../context/CartContext.jsx';
import { Home, Utensils, Tag, Package, Search, ShoppingCart, User, LogOut, ChevronDown } from 'lucide-react';
import './Navbar.css';

const NAV_LINKS = [
  { label: 'Home',     path: '/',         icon: <Home size={18} /> },
  { label: 'Menu',     path: '/products', icon: <Utensils size={18} /> },
  { label: 'Offers',   path: '/offers',   icon: <Tag size={18} /> },
  { label: 'Track',    path: '/orders',   icon: <Package size={18} /> },
];

export default function Navbar() {
  const { user, logout }           = useContext(AuthContext);
  const { cartItems }              = useContext(CartContext);
  const navigate                   = useNavigate();

  const [scrolled,     setScrolled]     = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');

  const dropdownRef = useRef(null);

  // ── Scroll detection ──────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Close dropdown on outside click ──────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Lock body scroll when mobile menu is open ─────────────────
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // ── Total cart quantity ───────────────────────────────────────
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // ── Search submit ─────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileOpen(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────
  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  const getInitials = (name = '') =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      <nav className={`navbar${scrolled ? ' scrolled' : ''}`} role="navigation" aria-label="Main navigation">
        <div className="navbar__inner">

          {/* ── Brand ─────────────────────────────────────────── */}
          <Link to="/" className="navbar__brand" aria-label="FoodieExpress home">
            <div className="navbar__brand-icon">
              <Utensils size={24} color="var(--nav-accent)" />
            </div>
            <span className="navbar__brand-name">
              Foodie<span>Express</span>
            </span>
          </Link>

          {/* ── Search ────────────────────────────────────────── */}
          <form className="navbar__search" onSubmit={handleSearch} role="search">
            <input
              type="search"
              className="navbar__search-input"
              placeholder="Search dishes, cuisines…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search food"
            />
            <span className="navbar__search-icon" aria-hidden="true"><Search size={16} /></span>
          </form>

          {/* ── Desktop Links ─────────────────────────────────── */}
          <ul className="navbar__links" role="list">
            {NAV_LINKS.map((link) => (
              <li key={link.path}>
                <NavLink
                  to={link.path}
                  end={link.path === '/'}
                  className={({ isActive }) =>
                    `navbar__link${isActive ? ' active' : ''}`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* ── Actions ───────────────────────────────────────── */}
          <div className="navbar__actions">

            {/* Cart */}
            <Link
              to="/cart"
              className="navbar__cart-btn"
              aria-label={`Cart, ${cartCount} items`}
            >
              <span className="navbar__cart-icon" aria-hidden="true"><ShoppingCart size={20} /></span>
              <span className="navbar__cart-label">Cart</span>
              {cartCount > 0 && (
                <span className="navbar__cart-count" aria-live="polite">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            {/* Auth area - Always show Profile icon */}
            <div className="navbar__user" ref={dropdownRef}>
              <button
                className="navbar__avatar-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
                aria-label="User menu"
              >
                <div className="navbar__avatar">
                  {user?.avatar
                    ? <img src={user.avatar} alt={user?.name || 'User'} />
                    : getInitials(user?.name || 'Guest User')
                  }
                </div>
                <span className="navbar__avatar-name">{user?.name ? user.name.split(' ')[0] : 'Guest'}</span>
                <span className="navbar__avatar-chevron" aria-hidden="true"><ChevronDown size={14} /></span>
              </button>

              {dropdownOpen && (
                <div className="navbar__dropdown" role="menu">
                  <div className="navbar__dropdown-header">
                    <strong style={{ color: 'var(--nav-text)', fontSize: '0.875rem' }}>
                      {user?.name || 'Guest User'}
                    </strong>
                    <div className="navbar__dropdown-email">{user?.email || 'guest@example.com'}</div>
                  </div>

                  <Link
                    to="/profile"
                    className="navbar__dropdown-item"
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span className="navbar__dropdown-icon"><User size={16} /></span>
                    My Profile
                  </Link>

                  <Link
                    to="/orders"
                    className="navbar__dropdown-item"
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span className="navbar__dropdown-icon"><Package size={16} /></span>
                    My Orders
                  </Link>

                  <div className="navbar__dropdown-divider" aria-hidden="true" />

                  <button
                    className="navbar__dropdown-item navbar__dropdown-item--danger"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <span className="navbar__dropdown-icon"><LogOut size={16} /></span>
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Hamburger */}
            <button
              className={`navbar__hamburger${mobileOpen ? ' open' : ''}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile overlay ──────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="navbar__overlay"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile menu ─────────────────────────────────────── */}
      {mobileOpen && (
        <nav
          id="mobile-menu"
          className="navbar__mobile-menu"
          aria-label="Mobile navigation"
        >
          {/* Mobile search */}
          <div className="navbar__mobile-search">
            <form className="navbar__search" onSubmit={handleSearch} role="search">
              <input
                type="search"
                className="navbar__search-input"
                placeholder="Search dishes…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search food"
              />
              <span className="navbar__search-icon" aria-hidden="true"><Search size={16} /></span>
            </form>
          </div>

          {/* Nav links */}
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/'}
              className={({ isActive }) =>
                `navbar__mobile-link${isActive ? ' active' : ''}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <span aria-hidden="true">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}

          <div className="navbar__mobile-divider" aria-hidden="true" />

          <Link to="/profile" className="navbar__mobile-link" onClick={() => setMobileOpen(false)}>
            <span aria-hidden="true"><User size={18} /></span> My Profile
          </Link>
          <Link to="/orders" className="navbar__mobile-link" onClick={() => setMobileOpen(false)}>
            <span aria-hidden="true"><Package size={18} /></span> My Orders
          </Link>
          <div className="navbar__mobile-divider" aria-hidden="true" />
          <button className="navbar__mobile-link" style={{ color: '#e74c3c' }} onClick={handleLogout}>
            <span aria-hidden="true"><LogOut size={18} /></span> Sign Out
          </button>
        </nav>
      )}
    </>
  );
}