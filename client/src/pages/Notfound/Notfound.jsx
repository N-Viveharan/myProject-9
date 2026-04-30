import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './NotFound.css';

const QUICK_LINKS = [
  { icon: '🏠', label: 'Home',       to: '/' },
  { icon: '🍽️', label: 'Menu',       to: '/products' },
  { icon: '🛒', label: 'Cart',       to: '/cart' },
  { icon: '📦', label: 'My Orders',  to: '/orders' },
  { icon: '👤', label: 'Profile',    to: '/profile' },
];

const FOOD_CHIPS = ['🍔', '🍕', '🍣', '🥗', '🍰'];

const FOOD_MESSAGES = [
  'Looks like this dish got lost in the kitchen.',
  'This page went out for delivery and never came back.',
  'Even our best chefs can\'t find this one.',
  'This URL must have been eaten along the way.',
];

export default function NotFound() {
  const navigate               = useNavigate();
  const [query, setQuery]      = useState('');
  const randomMsg              = FOOD_MESSAGES[Math.floor(Math.random() * FOOD_MESSAGES.length)];

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="notfound-page">

      {/* Back nav */}
      <Link to="/" className="notfound-back" aria-label="Back to home">
        <span aria-hidden="true">←</span> FoodieExpress
      </Link>

      <main className="notfound-inner" role="main">

        {/* Big 404 */}
        <div
          className="notfound-number"
          aria-label="Error 404 — Page not found"
        >
          4
          <span className="notfound-number__emoji" aria-hidden="true" role="img">🍜</span>
          0
          <span aria-hidden="true">4</span>
        </div>

        {/* Floating food chips */}
        <div className="notfound-emojis" aria-hidden="true">
          {FOOD_CHIPS.map((emoji, i) => (
            <div key={i} className="notfound-emoji-chip">{emoji}</div>
          ))}
        </div>

        <div className="notfound-divider" aria-hidden="true" />

        {/* Headline */}
        <h1 className="notfound-title">
          Page not found — <em>but the food is!</em>
        </h1>

        <p className="notfound-desc">{randomMsg}</p>

        {/* Search */}
        <div className="notfound-search">
          <form
            className="notfound-search__form"
            onSubmit={handleSearch}
            role="search"
            aria-label="Search for food"
          >
            <label htmlFor="nf-search" className="sr-only">Search dishes</label>
            <input
              id="nf-search"
              type="search"
              className="notfound-search__input"
              placeholder="Search dishes, e.g. 'pizza'…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
            <button
              type="submit"
              className="notfound-search__btn"
              aria-label="Search"
            >
              🔍
            </button>
          </form>
        </div>

        {/* CTA buttons */}
        <div className="notfound-actions">
          <Link to="/" className="notfound-btn-primary">
            <span aria-hidden="true">🏠</span> Back to Home
          </Link>
          <Link to="/products" className="notfound-btn-secondary">
            <span aria-hidden="true">🍽️</span> Browse Menu
          </Link>
          <button
            className="notfound-btn-secondary"
            onClick={() => navigate(-1)}
            aria-label="Go back to previous page"
          >
            <span aria-hidden="true">←</span> Go Back
          </button>
        </div>

        {/* Quick links */}
        <nav className="notfound-links" aria-label="Quick navigation">
          <div className="notfound-links__label">Or jump to</div>
          <div className="notfound-links__row">
            {QUICK_LINKS.map(({ icon, label, to }) => (
              <Link key={to} to={to} className="notfound-link">
                <span aria-hidden="true">{icon}</span>
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
}