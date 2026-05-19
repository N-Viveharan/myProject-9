import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext } from '../../context/CartContext.jsx';
import ProductCard from '../../components/ProductCard/ProductCard.jsx';
import { SkeletonCards } from '../../components/Spinner/Spinner.jsx';
import './Home.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

/* ── Static data ─────────────────────────────────────────────── */
const STATS = [
  { num: '2M+',  label: 'Happy Orders' },
  { num: '500+', label: 'Menu Items' },
  { num: '4.8★', label: 'Avg Rating' },
  { num: '30min',label: 'Avg Delivery' },
];

const HOW_STEPS = [
  { icon: '🔍', title: 'Browse Menu',   desc: 'Explore 500+ dishes across 15 cuisines — filter by category, diet & price.' },
  { icon: '🛒', title: 'Add to Cart',   desc: 'Pick your favourites, customise quantity, and apply a discount coupon.' },
  { icon: '📍', title: 'Enter Address', desc: 'Drop your delivery location and choose a payment method.' },
  { icon: '🚀', title: 'Fast Delivery', desc: 'Sit back — your hot meal arrives at your door in under 30 minutes.' },
];

const CATEGORIES = [
  { icon: '🍔', name: 'Burgers',    value: 'Burgers' },
  { icon: '🍕', name: 'Pizza',      value: 'Pizza' },
  { icon: '🍣', name: 'Sushi',      value: 'Sushi' },
  { icon: '🍗', name: 'Chicken',    value: 'Chicken' },
  { icon: '🌱', name: 'Vegan',      value: 'Vegan' },
  { icon: '🍝', name: 'Pasta',      value: 'Pasta' },
  { icon: '🥗', name: 'Salads',     value: 'Salads' },
  { icon: '🍰', name: 'Desserts',   value: 'Desserts' },
  { icon: '🧃', name: 'Beverages',  value: 'Beverages' },
  { icon: '🌯', name: 'Wraps',      value: 'Wraps' },
];

const TRUST_ITEMS = [
  { icon: '⚡', title: 'Lightning Fast',   desc: 'Avg delivery under 30 minutes, guaranteed.' },
  { icon: '🌡️', title: 'Always Hot',       desc: 'Insulated packaging keeps food at perfect temp.' },
  { icon: '🔒', title: 'Secure Payments',  desc: 'Bank-grade encryption on every transaction.' },
  { icon: '♻️', title: 'Eco Packaging',    desc: '100% compostable packaging, zero plastic.' },
];

const TESTIMONIALS = [
  { name: 'Priya S.', location: 'Mumbai', text: 'Ordered sushi on a whim at 10 PM — it arrived in 28 minutes. Absolutely mind-blowing freshness!', stars: 5, init: 'PS' },
  { name: 'Arjun M.', location: 'Bangalore', text: 'The vegan menu is massive and genuinely delicious. Finally a delivery app that gets plant-based food.', stars: 5, init: 'AM' },
  { name: 'Kavya R.', location: 'Delhi', text: 'Coupon codes actually work! FLAT50 saved me on my first order. Became a daily user since.', stars: 5, init: 'KR' },
];

/* ── Component ───────────────────────────────────────────────── */
export default function Home() {
  const navigate                    = useNavigate();
  const { cartItems }               = useContext(CartContext);
  const [featured, setFeatured]     = useState([]);
  const [loading,  setLoading]      = useState(true);
  const [error,    setError]        = useState('');
  const [heroSearch, setHeroSearch] = useState('');

  /* ── Fetch featured products ─────────────────────────────── */
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        // Fetch latest 8 products; fall back to all if none are featured
        let res  = await fetch(`${API}/products?isFeatured=true&limit=8`);
        let data = await res.json();
        let items = data.products || [];
        // If no featured items exist yet, show the latest 8 products instead
        if (items.length === 0) {
          res  = await fetch(`${API}/products?limit=8&sort=createdAt_desc`);
          data = await res.json();
          items = data.products || [];
        }
        setFeatured(items);
      } catch {
        setError('Could not load featured items.');
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  /* ── Hero search submit ──────────────────────────────────── */
  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      navigate(`/products?search=${encodeURIComponent(heroSearch.trim())}`);
    }
  };

  return (
    <main className="home-page">

      {/* ════════════════════════════════════════════════════
          HERO
          ════════════════════════════════════════════════════ */}
      <section className="hero" aria-label="Hero">
        <div className="hero__bg" aria-hidden="true" />
        <div className="hero__grain" aria-hidden="true" />

        <div className="hero__inner">
          {/* Copy */}
          <div className="hero__copy">
            <div className="hero__eyebrow">
              <span className="hero__eyebrow-dot" aria-hidden="true" />
              Now delivering in 50+ cities
            </div>

            <h1 className="hero__headline">
              Food that feels like <em>home</em>.<br />
              Delivered in minutes.
            </h1>

            <p className="hero__sub">
              500+ dishes from the finest local kitchens — fresh, hot, and at your door
              faster than you can set the table.
            </p>

            {/* Inline search for hero */}
            <form onSubmit={handleHeroSearch} className="hero__cta-row" role="search">
              <Link to="/products" className="hero__btn-primary">
                <span aria-hidden="true">🍽️</span> Explore Menu
              </Link>
              <Link to="/register" className="hero__btn-secondary">
                <span aria-hidden="true">✨</span> Join for free
              </Link>
            </form>

            <div className="hero__delivery-badge">
              <span aria-hidden="true">🚴</span>
              Free delivery on orders over <strong>₹500</strong>
            </div>
          </div>

          {/* Visual */}
          <div className="hero__visual" aria-hidden="true">
            <div className="hero__frame">
              🍜
              <div className="hero__orbit">
                <div className="hero__orbit-item">🍕</div>
                <div className="hero__orbit-item">🍣</div>
                <div className="hero__orbit-item">🍔</div>
                <div className="hero__orbit-item">🥗</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="hero__stats" role="list" aria-label="Key stats">
          {STATS.map((s, i) => (
            <div key={s.label} className="hero__stat" role="listitem" style={{ '--i': i }}>
              <span className="hero__stat-num">{s.num}</span>
              <span className="hero__stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          HOW IT WORKS
          ════════════════════════════════════════════════════ */}
      <section className="how-it-works" aria-labelledby="how-title">
        <div className="how-it-works__inner">
          <div className="section-header">
            <span className="section-eyebrow">Simple process</span>
            <h2 className="section-title" id="how-title">Order in 4 easy steps</h2>
            <p className="section-sub">
              From craving to doorstep — it's faster than you think.
            </p>
          </div>

          <div className="how-it-works__steps" role="list">
            {HOW_STEPS.map((step, i) => (
              <div key={step.title} className="step-card" role="listitem">
                <span className="step-card__num" aria-hidden="true">{i + 1}</span>
                <span className="step-card__icon" aria-hidden="true">{step.icon}</span>
                <h3 className="step-card__title">{step.title}</h3>
                <p className="step-card__desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FEATURED PRODUCTS
          ════════════════════════════════════════════════════ */}
      <section className="featured" aria-labelledby="featured-title">
        <div className="featured__inner">
          <div className="featured__header">
            <div>
              <span className="section-eyebrow">Editor's picks</span>
              <h2 className="section-title" id="featured-title" style={{ marginBottom: 0 }}>
                Most loved dishes
              </h2>
            </div>
            <Link to="/products?isFeatured=true" className="featured__view-all">
              View all <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="featured__grid">
            {loading ? (
              <SkeletonCards count={8} />
            ) : error ? (
              <div className="featured__empty" role="alert">
                <span className="featured__empty-icon" aria-hidden="true">😕</span>
                {error}
              </div>
            ) : featured.length === 0 ? (
              <div className="featured__empty">
                <span className="featured__empty-icon" aria-hidden="true">🍽️</span>
                No featured items yet. Check back soon!
              </div>
            ) : (
              featured.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          CATEGORY SHOWCASE
          ════════════════════════════════════════════════════ */}
      <section className="cat-showcase" aria-labelledby="cat-title">
        <div className="cat-showcase__inner">
          <div className="section-header">
            <span className="section-eyebrow">Explore by type</span>
            <h2 className="section-title" id="cat-title">What are you craving?</h2>
          </div>

          <nav className="cat-showcase__grid" aria-label="Food categories">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                to={`/products?category=${encodeURIComponent(cat.value)}`}
                className="cat-tile"
                aria-label={`Browse ${cat.name}`}
              >
                <span className="cat-tile__icon" aria-hidden="true">{cat.icon}</span>
                <span className="cat-tile__name">{cat.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          TRUST STRIP
          ════════════════════════════════════════════════════ */}
      <section className="trust-strip" aria-labelledby="trust-title">
        <div className="trust-strip__inner">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="trust-item">
              <div className="trust-item__icon" aria-hidden="true">{item.icon}</div>
              <div>
                <p className="trust-item__title">{item.title}</p>
                <p className="trust-item__desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          TESTIMONIALS
          ════════════════════════════════════════════════════ */}
      <section className="testimonials" aria-labelledby="reviews-title">
        <div className="testimonials__inner">
          <div className="section-header">
            <span className="section-eyebrow">Real reviews</span>
            <h2 className="section-title" id="reviews-title">What our customers say</h2>
            <p className="section-sub">Rated 4.8 / 5 across 2 million+ orders.</p>
          </div>

          <div className="testimonials__grid" role="list">
            {TESTIMONIALS.map((t) => (
              <article key={t.name} className="testimonial-card" role="listitem">
                <div className="testimonial-card__quote" aria-hidden="true">"</div>
                <p className="testimonial-card__text">{t.text}</p>
                <div className="testimonial-card__author">
                  <div className="testimonial-card__avatar" aria-hidden="true">
                    {t.init}
                  </div>
                  <div>
                    <div className="testimonial-card__name">{t.name}</div>
                    <div className="testimonial-card__location">{t.location}</div>
                    <div className="testimonial-card__stars" aria-label={`${t.stars} stars`}>
                      {'★'.repeat(t.stars)}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          APP DOWNLOAD CTA
          ════════════════════════════════════════════════════ */}
      <section className="app-cta" aria-labelledby="app-title">
        <div className="app-cta__inner">
          <div>
            <h2 className="app-cta__title" id="app-title">
              Take FoodieExpress <br />everywhere you go
            </h2>
            <p className="app-cta__desc">
              Order faster, track in real-time, and unlock exclusive app-only deals.
              Available on iOS and Android.
            </p>
          </div>

          <div className="app-cta__badges">
            <a href="#" className="app-cta__badge" aria-label="Download on the App Store">
              <span className="app-cta__badge-icon" aria-hidden="true">🍎</span>
              <span>
                <span className="app-cta__badge-small">Download on the</span>
                <span className="app-cta__badge-name">App Store</span>
              </span>
            </a>
            <a href="#" className="app-cta__badge" aria-label="Get it on Google Play">
              <span className="app-cta__badge-icon" aria-hidden="true">▶</span>
              <span>
                <span className="app-cta__badge-small">Get it on</span>
                <span className="app-cta__badge-name">Google Play</span>
              </span>
            </a>
          </div>
        </div>
      </section>

    </main>
  );
}