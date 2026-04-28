import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

/* ── Data ───────────────────────────────────────────────────── */
const QUICK_LINKS = [
  { label: 'Home',        path: '/' },
  { label: 'Browse Menu', path: '/products' },
  { label: 'Offers',      path: '/offers', isNew: true },
  { label: 'Track Order', path: '/orders' },
  { label: 'My Cart',     path: '/cart' },
  { label: 'My Profile',  path: '/profile' },
];

const COMPANY_LINKS = [
  { label: 'About Us',      path: '/about' },
  { label: 'Careers',       path: '/careers', isNew: true },
  { label: 'Blog',          path: '/blog' },
  { label: 'Press',         path: '/press' },
  { label: 'Partner With Us', path: '/partners' },
  { label: 'Franchise',     path: '/franchise' },
];

const SUPPORT_LINKS = [
  { label: 'Help Centre',       path: '/help' },
  { label: 'FAQs',              path: '/faqs' },
  { label: 'Refund Policy',     path: '/refund' },
  { label: 'Delivery Info',     path: '/delivery' },
  { label: 'Report an Issue',   path: '/report' },
];

const SOCIAL_LINKS = [
  { icon: '𝕏', href: 'https://twitter.com',   label: 'Twitter / X' },
  { icon: '📘', href: 'https://facebook.com',  label: 'Facebook' },
  { icon: '📸', href: 'https://instagram.com', label: 'Instagram' },
  { icon: '▶️', href: 'https://youtube.com',   label: 'YouTube' },
];

const DELIVERY_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat',
  'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal',
  // duplicate for infinite ticker
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat',
  'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal',
];

const CURRENT_YEAR = new Date().getFullYear();

/* ── Component ──────────────────────────────────────────────── */
export default function Footer() {
  const [email,     setEmail]     = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) return;

    setLoading(true);
    // Simulate API call — replace with real newsletter service
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setLoading(false);
    setEmail('');
  };

  return (
    <footer className="footer" role="contentinfo">

      {/* ── Newsletter strip ──────────────────────────────── */}
      <section className="footer__newsletter" aria-label="Newsletter signup">
        <div className="footer__newsletter-inner">
          <div className="footer__newsletter-copy">
            <div className="footer__newsletter-eyebrow">
              <span aria-hidden="true">🔔</span> Stay in the loop
            </div>
            <h2 className="footer__newsletter-title">
              Deals, drops &amp; <br />delicious updates
            </h2>
            <p className="footer__newsletter-sub">
              No spam — just the good stuff. Unsubscribe anytime.
            </p>
          </div>

          {submitted ? (
            <div className="footer__newsletter-success" role="status" aria-live="polite">
              <span aria-hidden="true">✅</span>
              You're subscribed! Expect great things in your inbox.
            </div>
          ) : (
            <form
              className="footer__newsletter-form"
              onSubmit={handleSubscribe}
              noValidate
              aria-label="Newsletter subscription"
            >
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-email"
                type="email"
                className="footer__newsletter-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-required="true"
                disabled={loading}
              />
              <button
                type="submit"
                className="footer__newsletter-btn"
                disabled={loading || !email.trim()}
                aria-label="Subscribe to newsletter"
              >
                {loading ? 'Subscribing…' : 'Subscribe'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── Main grid ─────────────────────────────────────── */}
      <div className="footer__main">

        {/* Brand column */}
        <div className="footer__brand">
          <div>
            <Link to="/" className="footer__logo" aria-label="FoodieExpress home">
              <div className="footer__logo-icon" aria-hidden="true">🍜</div>
              <span className="footer__logo-name">
                Foodie<span>Express</span>
              </span>
            </Link>
          </div>

          <p className="footer__tagline">
            Fresh, fast, and made with love. We bring your favourite restaurant meals
            right to your door — hot, hygienic, and always on time.
          </p>

          <div className="footer__rating" aria-label="4.8 star rating">
            <span aria-hidden="true">⭐</span>
            4.8 / 5 &nbsp;· 2M+ happy orders
          </div>

          {/* App store badges */}
          <div className="footer__app-badges">
            <a
              href="#"
              className="footer__badge"
              aria-label="Download on the App Store"
              rel="noopener noreferrer"
            >
              <span className="footer__badge-icon" aria-hidden="true">🍎</span>
              <span className="footer__badge-text">
                <span className="footer__badge-label">Download on the</span>
                <span className="footer__badge-store">App Store</span>
              </span>
            </a>

            <a
              href="#"
              className="footer__badge"
              aria-label="Get it on Google Play"
              rel="noopener noreferrer"
            >
              <span className="footer__badge-icon" aria-hidden="true">▶</span>
              <span className="footer__badge-text">
                <span className="footer__badge-label">Get it on</span>
                <span className="footer__badge-store">Google Play</span>
              </span>
            </a>
          </div>

          {/* Social */}
          <nav className="footer__social" aria-label="Social media links">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                className="footer__social-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
              >
                {s.icon}
              </a>
            ))}
          </nav>
        </div>

        {/* Quick Links */}
        <div className="footer__col">
          <h3 className="footer__col-title">Quick Links</h3>
          <ul className="footer__col-links" role="list">
            {QUICK_LINKS.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  className={`footer__col-link${link.isNew ? ' footer__col-link--new' : ''}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div className="footer__col">
          <h3 className="footer__col-title">Company</h3>
          <ul className="footer__col-links" role="list">
            {COMPANY_LINKS.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  className={`footer__col-link${link.isNew ? ' footer__col-link--new' : ''}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support / Contact */}
        <div className="footer__col">
          <h3 className="footer__col-title">Support</h3>
          <ul className="footer__col-links" role="list">
            {SUPPORT_LINKS.map((link) => (
              <li key={link.path}>
                <Link to={link.path} className="footer__col-link">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: '1.5rem' }}>
            <h3 className="footer__col-title">Contact</h3>

            <address style={{ fontStyle: 'normal' }}>
              <div className="footer__contact-item">
                <span className="footer__contact-icon" aria-hidden="true">📍</span>
                <span>42 Curry Lane, Food Park, <br />Mumbai — 400001, India</span>
              </div>

              <div className="footer__contact-item">
                <span className="footer__contact-icon" aria-hidden="true">📞</span>
                <a href="tel:+918001234567" className="footer__contact-link">
                  +91 800 123 4567
                </a>
              </div>

              <div className="footer__contact-item">
                <span className="footer__contact-icon" aria-hidden="true">✉️</span>
                <a href="mailto:support@foodieexpress.in" className="footer__contact-link">
                  support@foodieexpress.in
                </a>
              </div>

              <div className="footer__contact-item">
                <span className="footer__contact-icon" aria-hidden="true">🕐</span>
                <span>Mon – Sun · 8 AM – 11 PM</span>
              </div>
            </address>
          </div>
        </div>
      </div>

      {/* ── Delivery cities ticker ─────────────────────────── */}
      <div className="footer__delivery" aria-label="Delivery cities">
        <div className="footer__delivery-inner">
          <span className="footer__delivery-label" aria-hidden="true">
            🚴 Delivering to:
          </span>
          <div className="footer__delivery-ticker" aria-hidden="true">
            <div className="footer__delivery-track">
              {DELIVERY_CITIES.map((city, idx) => (
                <span key={idx} className="footer__delivery-city">
                  {city}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────── */}
      <div className="footer__bottom">
        <div className="footer__bottom-inner">
          <p className="footer__copyright">
            © {CURRENT_YEAR}{' '}
            <a href="/" aria-label="FoodieExpress homepage">FoodieExpress</a>
            . All rights reserved. Made with ❤️ in India.
          </p>

          <nav className="footer__legal-links" aria-label="Legal links">
            <a href="/privacy"  className="footer__legal-link">Privacy Policy</a>
            <span className="footer__legal-sep" aria-hidden="true">·</span>
            <a href="/terms"    className="footer__legal-link">Terms of Use</a>
            <span className="footer__legal-sep" aria-hidden="true">·</span>
            <a href="/cookies"  className="footer__legal-link">Cookie Policy</a>
            <span className="footer__legal-sep" aria-hidden="true">·</span>
            <a href="/sitemap"  className="footer__legal-link">Sitemap</a>
          </nav>
        </div>
      </div>

    </footer>
  );
}