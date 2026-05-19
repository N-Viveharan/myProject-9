import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Offers.css';

/* ── Static coupon data (mirrors CartContext) ────────────────── */
const COUPONS = [
  {
    code: 'WELCOME10',
    icon: '🎁',
    type: 'percent',
    value: '10% OFF',
    headline: 'Welcome Discount',
    desc: 'Get 10% off your very first order. No minimum spend required — just our gift to you.',
    minOrder: null,
    badge: 'Most Popular',
  },
  {
    code: 'FLAT50',
    icon: '💸',
    type: 'flat',
    value: '₹50 OFF',
    headline: 'Flat Fifty',
    desc: 'Enjoy a flat ₹50 discount on any order above ₹300. Great for everyday meals.',
    minOrder: '₹300',
    badge: null,
  },
  {
    code: 'FREESHIP',
    icon: '🚴',
    type: 'ship',
    value: 'FREE DELIVERY',
    headline: 'Zero Delivery Fee',
    desc: 'Wave goodbye to delivery charges. Use this code and we cover the shipping, always.',
    minOrder: null,
    badge: 'Limited',
  },
  {
    code: 'FEAST20',
    icon: '🍽️',
    type: 'feast',
    value: '20% OFF',
    headline: 'Feast Mode',
    desc: 'Planning a big spread? Save 20% on orders of ₹600 or more. The more you order, the more you save.',
    minOrder: '₹600',
    badge: 'Best Value',
  },
];

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
              {COUPONS.map((c, i) => (
                <div
                  key={c.code}
                  className={`offers-hero__floating-tag offers-hero__floating-tag--${i}`}
                >
                  <span>{c.icon}</span>
                  <strong>{c.value}</strong>
                </div>
              ))}
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

          <div className="offers-coupon-grid" role="list">
            {COUPONS.map((coupon) => (
              <article
                key={coupon.code}
                className={`coupon-card coupon-card--${coupon.type}`}
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
                    {coupon.icon}
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
