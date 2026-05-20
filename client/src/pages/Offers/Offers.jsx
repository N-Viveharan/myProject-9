import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Offers.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const PROMO_BANNERS = [
  {
    id: 'weekend',
    emoji: '🍕',
    tag: 'Every Weekend',
    title: 'Weekend Bonanza',
    desc: 'Order any two pizzas every Saturday or Sunday and get a complimentary dessert of your choice — absolutely free.',
    cta: 'Shop Pizzas',
    link: '/products?category=Pizza',
  },
  {
    id: 'vegan',
    emoji: '🌱',
    tag: 'All Month Long',
    title: 'Healthy Start',
    desc: 'Our new Vegan & Salad range is here. Fresh, organic, chef-curated — and 15% lighter on your wallet all month.',
    cta: 'Explore Vegan',
    link: '/products?category=Vegan',
  },
];

const HOW_STEPS = [
  { icon: '🔍', step: '01', label: 'Find a Coupon',     desc: 'Browse the deals below and pick one that fits your order.' },
  { icon: '📋', step: '02', label: 'Copy the Code',     desc: 'Tap "Copy" and the code lands straight on your clipboard.' },
  { icon: '🛒', step: '03', label: 'Add Items to Cart', desc: 'Head to the menu, build your perfect order.' },
  { icon: '✅', step: '04', label: 'Paste & Save',      desc: 'Paste your code in the cart or checkout — savings applied instantly.' },
];

/* ── Component ───────────────────────────────────────────────── */
export default function Offers() {
  const [copied, setCopied] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const res = await fetch(`${API_BASE}/offers`);
        const data = await res.json();
        setOffers(data.offers || []);
      } catch (error) {
        console.error('Failed to fetch offers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <main className="offers-page">

      {/* ════════════════════════════════════════════════════
          HERO
          ════════════════════════════════════════════════════ */}
      <section className="offers-hero" aria-label="Offers hero">
        <div className="offers-hero__bg" aria-hidden="true" />
        <div className="offers-hero__grain" aria-hidden="true" />

        <div className="offers-hero__inner">
          <div className="offers-hero__copy">
            <div className="offers-hero__eyebrow">
              <span className="offers-hero__eyebrow-dot" aria-hidden="true" />
              Exclusive deals, updated weekly
            </div>
            <h1 className="offers-hero__headline">
              Big savings on<br /><em>every bite.</em>
            </h1>
            <p className="offers-hero__sub">
              Unlock coupons, combo offers, and promo deals crafted just for you.
              The more you eat, the more you save.
            </p>
            <div className="offers-hero__actions">
              <a href="#coupons" className="offers-hero__btn-primary">
                <span aria-hidden="true">🏷️</span> Browse Coupons
              </a>
              <Link to="/products" className="offers-hero__btn-secondary">
                <span aria-hidden="true">🍽️</span> Explore Menu
              </Link>
            </div>
          </div>

          <div className="offers-hero__visual" aria-hidden="true">
            <div className="offers-hero__tag-stack">
              {offers.slice(0, 4).map((c, i) => (
                <div
                  key={c.code}
                  className={`offers-hero__floating-tag offers-hero__floating-tag--${i}`}
                >
                  <span>{c.icon || '🎁'}</span>
                  <strong>{c.value}</strong>
                </div>
              ))}
              {offers.length === 0 && !loading && (
                <div className="offers-hero__floating-tag offers-hero__floating-tag--0">
                  <span>✨</span>
                  <strong>More Coming Soon</strong>
                </div>
              )}
              <div className="offers-hero__center-circle">
                🔥<br /><span>Hot Deals</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          HOW IT WORKS
          ════════════════════════════════════════════════════ */}
      <section className="offers-how" aria-labelledby="how-title">
        <div className="offers-how__inner">
          <div className="section-header">
            <span className="section-eyebrow">How it works</span>
            <h2 className="section-title" id="how-title">Redeem in 4 easy steps</h2>
          </div>
          <div className="offers-how__steps" role="list">
            {HOW_STEPS.map((s) => (
              <div className="offers-step" key={s.step} role="listitem">
                <div className="offers-step__num" aria-hidden="true">{s.step}</div>
                <span className="offers-step__icon" aria-hidden="true">{s.icon}</span>
                <h3 className="offers-step__label">{s.label}</h3>
                <p className="offers-step__desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          COUPON CARDS
          ════════════════════════════════════════════════════ */}
      <section className="offers-coupons" id="coupons" aria-labelledby="coupons-title">
        <div className="offers-coupons__inner">
          <div className="section-header">
            <span className="section-eyebrow">Active offers</span>
            <h2 className="section-title" id="coupons-title">Your coupon collection</h2>
            <p className="section-sub">
              Tap any code to copy it. Apply at cart or checkout for instant savings.
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-text-muted)' }}>
              <span className="spinner" style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>⌛</span>
              Loading latest offers...
            </div>
          ) : offers.length > 0 ? (
            <div className="offers-coupon-grid" role="list">
              {offers.map((coupon) => (
                <article
                  key={coupon.code}
                  className={`coupon-card coupon-card--${coupon.type || 'percent'}`}
                  role="listitem"
                  aria-label={`Coupon ${coupon.code}: ${coupon.headline}`}
                >
                  {coupon.badge && (
                    <div className="coupon-card__badge" aria-label={`Badge: ${coupon.badge}`}>
                      {coupon.badge}
                    </div>
                  )}

                  <div className="coupon-card__top">
                    <div className="coupon-card__icon-wrap" aria-hidden="true">
                      {coupon.icon || '🎁'}
                    </div>
                    <div className="coupon-card__value" aria-label={`Discount: ${coupon.value}`}>
                      {coupon.value}
                    </div>
                  </div>

                  <h3 className="coupon-card__headline">{coupon.headline}</h3>
                  <p className="coupon-card__desc">{coupon.desc}</p>

                  {coupon.minOrder && (
                    <div className="coupon-card__min">
                      <span aria-hidden="true">📦</span> Min. order: <strong>{coupon.minOrder}</strong>
                    </div>
                  )}

                  <div className="coupon-card__divider" aria-hidden="true">
                    <span />
                    <span />
                  </div>

                  <div className="coupon-card__footer">
                    <span className="coupon-card__code" aria-label={`Code: ${coupon.code}`}>
                      {coupon.code}
                    </span>
                    <button
                      className={`coupon-card__copy${copied === coupon.code ? ' copied' : ''}`}
                      onClick={() => handleCopy(coupon.code)}
                      aria-label={copied === coupon.code ? 'Copied!' : `Copy code ${coupon.code}`}
                    >
                      {copied === coupon.code ? '✓ Copied!' : 'Copy Code'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', background: 'var(--color-surface)', borderRadius: '24px', border: '1px dashed var(--color-border)' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>😲</span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>No active offers right now</h3>
              <p style={{ color: 'var(--color-text-muted)' }}>Check back later for exciting new deals!</p>
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          PROMO BANNERS
          ════════════════════════════════════════════════════ */}
      <section className="offers-promos" aria-labelledby="promos-title">
        <div className="offers-promos__inner">
          <div className="section-header">
            <span className="section-eyebrow">Special promotions</span>
            <h2 className="section-title" id="promos-title">This week's highlights</h2>
          </div>

          <div className="offers-promos__grid">
            {PROMO_BANNERS.map((promo) => (
              <div
                key={promo.id}
                className={`promo-card promo-card--${promo.id}`}
                role="region"
                aria-labelledby={`promo-title-${promo.id}`}
              >
                <div className="promo-card__emoji" aria-hidden="true">{promo.emoji}</div>
                <div className="promo-card__tag">{promo.tag}</div>
                <h3 className="promo-card__title" id={`promo-title-${promo.id}`}>{promo.title}</h3>
                <p className="promo-card__desc">{promo.desc}</p>
                <Link to={promo.link} className="promo-card__cta">{promo.cta} →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          CTA FOOTER
          ════════════════════════════════════════════════════ */}
      <section className="offers-cta" aria-labelledby="offers-cta-title">
        <div className="offers-cta__inner">
          <span className="offers-cta__icon" aria-hidden="true">🛒</span>
          <h2 className="offers-cta__title" id="offers-cta-title">
            Ready to order?
          </h2>
          <p className="offers-cta__sub">
            Copy a coupon above, pick your dishes, and enjoy the best food in town — for less.
          </p>
          <Link to="/products" className="offers-cta__btn">
            <span aria-hidden="true">🍔</span> Order Now
          </Link>
        </div>
      </section>

    </main>
  );
}
